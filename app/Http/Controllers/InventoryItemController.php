<?php

namespace App\Http\Controllers;
use App\Enums\Inventory\PortionStatus;
use App\Enums\Inventory\TrackingType;
use App\Http\Requests\StoreInventoryItemRequest;
use App\Http\Requests\UpdateInventoryItemRequest;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use App\Models\Branch;
use App\Services\InventoryService;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
class InventoryItemController extends Controller
{
    /**
     * Display a listing of all global inventory items.
     * This is an admin-only function.
     */
    public function index(): Response
    {
        $this->authorize('viewAny', InventoryItem::class);

        $items = InventoryItem::with('category:id,name')
            ->orderBy('name')
            ->paginate(15);

        return Inertia::render('Inventory/Items/Index', [
            'items' => $items,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $branchesQuery = Branch::query();

        // Non-admins can only create items for their own branch.
        if (!$user->is_admin && $user->employee) {
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        return Inertia::render('Inventory/Items/Create', [
            'categories' => InventoryCategory::orderBy('name')->get(['id', 'name']),
            'branches' => $branchesQuery->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreInventoryItemRequest $request, InventoryService $inventoryService): RedirectResponse
    {
        $this->authorize('create', InventoryItem::class);

        // The entire transaction logic is now handled by the service.
        $inventoryService->createItem($request->validated());

        return redirect()->route('inventory.items.index')->with('success', 'Item created successfully.');
    }

    // ... edit() method is unchanged ...

    public function update(UpdateInventoryItemRequest $request, InventoryItem $item, InventoryService $inventoryService): RedirectResponse
    {
        $this->authorize('update', $item);

        // The service now handles the update and branch syncing logic.
        $inventoryService->updateItem($item, $request->validated());

        return redirect()->route('inventory.items.index')->with('success', 'Item updated successfully.');
    }

   public function edit(InventoryItem $item): Response
    {
        $this->authorize('view', $item);
        $user = Auth::user();

        // 1. Load relationships.
        $item->load(['branches' => function ($query) {
            // Eager load branches, including archived ones, to get pivot data.
            $query->withTrashed();
        }, 'category:id,name']);
        $item->loadCount('batches');

        // 2. Get a base list of all ACTIVE (not soft-deleted) branches.
        // The default scope of the Branch model handles this automatically.
        $activeBranchesQuery = Branch::query();
        if (!$user->is_admin && $user->employee) {
            $activeBranchesQuery->where('id', $user->employee->branch_id);
        }
        $branches = $activeBranchesQuery->orderBy('name')->get();

        // 3. Get any ARCHIVED branches this item is still stocked in.
        $assignedArchivedBranches = $item->branches()->whereNotNull('branches.deleted_at')->get();

        // 4. Merge the two lists to get a complete set for the form.
        $allBranches = $branches->merge($assignedArchivedBranches)->unique('id');

        // 5. Prepare the data for the frontend, now with an 'is_archived' flag.
        $branchStockData = $allBranches->map(function ($branch) use ($item) {
            $itemBranch = $item->branches->firstWhere('id', $branch->id);
            return [
                'branch_id' => $branch->id,
                'name' => $branch->name,
                'is_stocked' => (bool) $itemBranch,
                'low_stock_threshold' => $itemBranch?->pivot->low_stock_threshold ?? 0,
                'is_archived' => $branch->deleted_at !== null, // Pass the archived status to the UI
            ];
        });

        return Inertia::render('Inventory/Items/Edit', [
            'item' => $item,
            'categories' => InventoryCategory::orderBy('name')->get(['id', 'name']),
            'branches' => $branchStockData,
            'isBatched' => $item->batches_count > 0,
        ]);
    }


    public function destroy(InventoryItem $item): RedirectResponse
    {
        $this->authorize('delete', $item);
        // CORRECTED: Changed the check from `batches()->exists()` to the more accurate
        // `portions()->where('status', 'unused')->exists()`. This allows for the deletion
        // of fully-used items while protecting items with active stock.
        if ($item->portions()->where('status', 'unused')->exists()) {
            return redirect()->back()->with('error', 'Cannot delete item. It has unused portions in stock.');
        }
        $item->delete();
        return redirect()->route('inventory.items.index')->with('success', 'Item deleted.');
    }

 public function batchesWithPortions(Request $request, InventoryItem $item)
    {
        $validated = $request->validate([
            'source_branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);

        $batches = $item->batches()
            ->where('branch_id', $validated['source_branch_id'])
            ->whereHas('portions', function ($query) {
                $query->where('status', PortionStatus::UNUSED);
            })
            ->with(['portions' => function ($query) {
                $query->where('status', PortionStatus::UNUSED)->select('id', 'inventory_batch_id', 'label');
            }])
            ->get(['id', 'batch_number']);

        return response()->json($batches);
    }
    public function getBatchesForItem(InventoryItem $item): JsonResponse
    {
        $this->authorize('view', $item);
        $user = Auth::user();
        $query = $item->batches();

        if (!$user->is_admin && $user->employee) {
            $query->where('branch_id', $user->employee->branch_id);
        }

   $batches = $query->where('remaining_quantity', '>', 0)
            ->orderBy('created_at', 'asc')
            ->get(['id', 'batch_number', 'remaining_quantity', 'expiration_date', 'created_at']);

        return response()->json($batches);
    }
     public function getAvailablePortionsForTransfer(InventoryItem $item, Request $request): JsonResponse
    {
        $this->authorize('view', $item);

        $validated = $request->validate([
            'source_branch_id' => ['required', 'integer', 'exists:branches,id'],
        ]);

        $batches = $item->batches()
            ->where('branch_id', $validated['source_branch_id'])
            ->whereHas('portions', fn ($q) => $q->where('status', 'unused'))
            ->with(['portions' => fn ($q) => $q->where('status', 'unused')->orderBy('portion_number')])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($batches);
    }
}
