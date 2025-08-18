<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Jobs\ProcessSale;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Branch;
use App\Models\InventoryItem;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\SaleService;

class SaleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $branches = collect();
        $currentBranch = null;
        $selectedBranchId = null;

        if ($user->is_admin) {
            $branches = Branch::query()->select('id', 'name')->orderBy('name')->get();
            $requestedBranchId = $request->input('branch');

            if ($requestedBranchId && $branches->contains('id', $requestedBranchId)) {
                $selectedBranchId = $requestedBranchId;
                $currentBranch = $branches->firstWhere('id', (int) $requestedBranchId);
            } elseif ($branches->isNotEmpty()) {
                $selectedBranchId = $branches->first()->id;
                $currentBranch = $branches->first();
            }
       } else {
            // CORRECTED: Access the branch through the employee relationship for consistency.
            $employee = $user->employee;
            if ($employee && $employee->branch) {
                $selectedBranchId = $employee->branch_id;
                $currentBranch = $employee->branch;
                $branches = collect([$currentBranch]);
            }
        }

        $query = Sale::query();

        if ($selectedBranchId) {
            $query->where('branch_id', $selectedBranchId);
        } else {
            $query->whereRaw('1 = 0'); // Show no sales if no branch context
        }

        $sales = $query->with('user:id,name', 'branch:id,name')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'branches' => $branches,
            'currentBranch' => $currentBranch,
            'filters' => ['branch' => $request->input('branch')],
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();
        $branches = collect();
        $currentBranch = null;

        if ($user->is_admin) {
            $branches = Branch::query()->select('id', 'name')->orderBy('name')->get();
            if ($branches->isEmpty()) {
                return redirect()->route('dashboard')->with('error', 'No branches exist. Please create a branch before recording a sale.');
            }
            $requestedBranchId = $request->input('branch');
            $currentBranch = $branches->firstWhere('id', $requestedBranchId) ?? $branches->first();
        } else {
            $employee = $user->employee;
            $currentBranch = $employee ? $employee->branch : null;
            if (!$currentBranch) {
                return redirect()->route('dashboard')->with('error', 'You must be assigned to a branch to record sales.');
            }
            $branches = collect([$currentBranch]);
        }

        // Only proceed if we have a branch context
        if (!$currentBranch) {
            return redirect()->route('dashboard')->with('error', 'You must be assigned to a branch to record sales.');
        }

        // Get products by category that are available at the current branch
        $productsByCategory = ProductCategory::with(['products' => function ($query) use ($currentBranch) {
            $query->availableAt($currentBranch->id)
                  ->where('is_active', true)
                  ->orderBy('name');
        }])
        ->whereHas('products', function ($query) use ($currentBranch) {
            $query->availableAt($currentBranch->id)
                  ->where('is_active', true);
        })
        ->orderBy('name')
        ->get();

        // FIX: Use a subquery to get product IDs first, then fetch complete products
        // This avoids the GROUP BY issue while maintaining the same functionality
        $recentProductIds = DB::table('products')
            ->join('sale_items', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.branch_id', $currentBranch->id)
            ->where('sales.created_at', '>', now()->subDays(30))
            ->where('products.is_active', true)
            ->whereExists(function ($query) use ($currentBranch) {
                $query->select(DB::raw(1))
                      ->from('branches')
                      ->join('branch_product', 'branches.id', '=', 'branch_product.branch_id')
                      ->where('branch_product.branch_id', $currentBranch->id)
                      ->where('branch_product.is_available', true)
                      ->whereNull('branches.deleted_at')
                      ->whereRaw('products.id = branch_product.product_id');
            })
            ->groupBy('products.id')
            ->orderByRaw('COUNT(sale_items.id) DESC')
            ->limit(8)
            ->pluck('products.id');

        // Now fetch the complete products with their relationships
        $recentProducts = Product::whereIn('id', $recentProductIds)
            ->where('is_active', true)
            ->get();

        return Inertia::render('Sales/Create', [
            'productsByCategory' => $productsByCategory,
            'branches' => $branches,
            'currentBranch' => $currentBranch,
            'recentProducts' => $recentProducts,
        ]);
    }
      public function show(Sale $sale): Response
    {
        $sale->load(['items.product', 'user', 'branch']);

        return Inertia::render('Sales/Show', [
            'sale' => $sale,
        ]);
    }
    /**
     * Store a newly created resource in storage.
     */
   public function store(StoreSaleRequest $request, SaleService $saleService)
{
    $sale = $saleService->createSale($request->validated(), $request->user()->id);

    // Follow the established redirect-with-flash pattern
    return redirect()->back()->with('success', 'Sale recorded successfully.');
}


 public function checkStock(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'items' => 'present|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            $this->performFastStockCheck($validated['items'], $validated['branch_id']);
            // If no exception is thrown, stock is sufficient.
            return response()->json(['message' => 'Stock available']);
        } catch (ValidationException $e) {
            // If stock is insufficient, return the consolidated error message.
            return response()->json(['message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        }
    }


    /**
     * Perform a quick, non-locking check for obvious out-of-stock items.
     *
    * @throws ValidationException
     */
    private function performFastStockCheck(array $items, int $branchId): void
    {
        if (empty($items)) {
            return;
        }

        $requiredIngredients = $this->getRequiredIngredientsForCheck($items);
        if (empty($requiredIngredients)) {
            return;
        }

        // Efficiently fetch all required inventory items and their current stock in one go.
        $inventoryItems = InventoryItem::whereIn('id', array_keys($requiredIngredients))
            ->withSum(['batches' => fn ($q) => $q->where('branch_id', $branchId)], 'remaining_quantity')
            ->get()
            ->keyBy('id');

        $stockErrors = []; // Initialize an array to collect all stock errors.

        foreach ($requiredIngredients as $itemId => $totalQuantityNeeded) {
            $item = $inventoryItems->get($itemId);
            $currentStock = $item ? (float) $item->batches_sum_remaining_quantity : 0;

            if ($currentStock < $totalQuantityNeeded) {
                $itemName = $item->name ?? "Item ID {$itemId}";
                // Add a detailed error message for each insufficient item.
                $stockErrors[] = "{$itemName} (Required: {$totalQuantityNeeded}, Available: {$currentStock})";
            }
        }

        // After checking all items, if any errors were found, throw a single, consolidated exception.
        if (!empty($stockErrors)) {
            $errorMessage = 'Insufficient stock for: ' . implode('; ', $stockErrors) . '.';
            throw ValidationException::withMessages([
                'items' => $errorMessage,
            ]);
        }
    }

    /**
     * Helper to aggregate required ingredients for the fast stock check.
     */
    private function getRequiredIngredientsForCheck(array $items): array
    {
        $productIds = array_column($items, 'product_id');
        $products = Product::with('ingredients')->findMany($productIds)->keyBy('id');
        $required = [];

        foreach ($items as $item) {
            if (!$product = $products->get($item['product_id'])) {
                continue;
            }
            foreach ($product->ingredients as $ingredient) {
                $itemId = $ingredient->id;
                $quantityNeeded = $item['quantity'] * $ingredient->pivot->quantity_required;
                $required[$itemId] = ($required[$itemId] ?? 0) + $quantityNeeded;
            }
        }
        return $required;
    }
}
