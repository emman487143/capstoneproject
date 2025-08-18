<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\InventoryItem;
use App\Models\ProductCategory;
use App\Services\ProductService;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProductController extends Controller
{
    public function __construct(protected ProductService $productService)
    {
        $this->authorizeResource(Product::class, 'product');
    }

   public function index(Request $request): Response
    {
        $query = Product::with(['category', 'branches'])->latest();

        // Apply search filter
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        // Apply category filter
        if ($request->filled('category')) {
            $query->where('product_category_id', $request->input('category'));
        }

        return Inertia::render('Products/Index', [
            'products' => $query->paginate(10)->withQueryString(),
            'categories' => ProductCategory::all(['id', 'name']), // For the filter dropdown
            'filters' => $request->only(['search', 'category']), // Pass filters back to the view
        ]);
    }

    public function create(): Response
    {
        // Get branches based on user role
        $branchesQuery = Branch::query()->orderBy('name');
        $user = Auth::user();

        if (!$user->is_admin && $user->employee) {
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        $branches = $branchesQuery->get();

        return Inertia::render('Products/Create', [
            'categories' => ProductCategory::orderBy('name')->get(),
            'inventoryItems' => InventoryItem::select('id', 'name', 'unit')->orderBy('name')->get(),
            'branches' => $branches,
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        try {
            $this->productService->createProduct($request->validated());
        } catch (Throwable $e) {
            Log::error('Product creation failed: ' . $e->getMessage(), ['exception' => $e]);
            return back()->with('error', 'There was a problem creating the product.')->withInput();
        }

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function edit(Product $product): Response
    {
        // Load product relationships
        $product->load(['ingredients', 'branches']);

        // Get branches based on user role
        $branchesQuery = Branch::query()->orderBy('name');
        $user = Auth::user();

        if (!$user->is_admin && $user->employee) {
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        $branches = $branchesQuery->get();

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'categories' => ProductCategory::orderBy('name')->get(),
            'inventoryItems' => InventoryItem::select('id', 'name', 'unit')->orderBy('name')->get(),
            'branches' => $branches,
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        try {
            $this->productService->updateProduct($product, $request->validated());
        } catch (Throwable $e) {
            Log::error('Product update failed: ' . $e->getMessage(), ['product_id' => $product->id, 'exception' => $e]);
            return back()->with('error', 'There was a problem updating the product.')->withInput();
        }

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        try {
            $this->productService->deleteProduct($product);
        } catch (Throwable $e) {
            Log::error('Product deletion failed: ' . $e->getMessage(), ['product_id' => $product->id, 'exception' => $e]);
            return back()->with('error', 'There was a problem deleting the product.');
        }

        return redirect()->route('products.index')->with('success', 'Product deleted successfully.');
    }
}
