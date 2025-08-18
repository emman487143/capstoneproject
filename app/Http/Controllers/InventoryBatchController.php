<?php

namespace App\Http\Controllers;

use App\Enums\Inventory\LogAction;
use App\Enums\Inventory\PortionStatus;
use App\Http\Requests\CorrectBatchCountRequest;
use App\Http\Requests\StoreInventoryBatchRequest;
use App\Http\Requests\UpdateInventoryBatchRequest;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
class InventoryBatchController extends Controller
{
    public function __construct(protected InventoryService $inventoryService)
    {
    }

    /**
     * Display a listing of the resource.
     */
   public function index(Request $request, InventoryItem $item): Response
    {
        $this->authorize('viewAny', [InventoryBatch::class, $item]);

        $user = $request->user();
        $query = InventoryBatch::with(['inventoryItem', 'branch'])->where('inventory_item_id', $item->id);

        // Prioritize branch_id from the request for consistent filtering.
        $branchId = $request->input('branch');
        $currentBranch = null;

        if ($branchId) {
            // If a branch is specified in the URL, use it.
            $query->where('branch_id', $branchId);
            $currentBranch = Branch::find($branchId);
        } elseif (!$user->is_admin) {
            // CORRECTED: Use the consistent employee relationship to find the branch.
            $employee = $user->employee;
            if ($employee && $employee->branch) {
                $branchId = $employee->branch_id;
                $query->where('branch_id', $branchId);
                $currentBranch = $employee->branch;
            }
        }
        // If no branch in URL and user is admin, they see all batches for the item.

        $batches = $query->latest('created_at')->paginate(10)->withQueryString();

        return inertia('Inventory/Batches/Index', [
            'batches' => $batches,
            'filteredItem' => $item,
            'currentBranch' => $currentBranch,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $this->authorize('create', InventoryBatch::class);

        $user = $request->user();
        $preselectedItem = null;
        $preselectedBranch = null;
        $isBranchLocked = false;
        $isItemLocked = false;

        // A non-admin user is ALWAYS locked to their branch.
        if (!$user->is_admin) {
            // CORRECTED: Use the consistent employee relationship to find the branch.
            $employee = $user->employee;
            if ($employee && $employee->branch) {
                $preselectedBranch = $employee->branch;
                $isBranchLocked = true;
            } else {
                // Failsafe: A staff member without a branch cannot create a batch.
                return redirect()->route('inventory.index')->with('error', 'You must be assigned to a branch to add inventory.');
            }
        }
        // An admin can have a branch pre-selected via the request.
        elseif ($request->has('branch_id')) {
            $branchId = $request->input('branch_id');
            if ($branchId) {
                $preselectedBranch = Branch::find($branchId);
                // Lock it for admins too, to enforce context.
                $isBranchLocked = true;
            }
            // Note: The 'else' case where an admin has no branch context
            // is handled on the operational inventory page, which requires a branch selection.
            // A redirect here remains as a fallback.
            else {
                // This case occurs if an admin was in an "All Branches" view and clicked
                // "Add Batch". We must force them to select a branch context first.
                return redirect()->route('inventory.index')->with('error', 'Please select a branch before adding a batch.');
            }
        }

         if ($request->has('item_id')) {
            $preselectedItem = InventoryItem::findOrFail($request->input('item_id'));
              $isItemLocked = true;
        }

        // Admins see all branches. Non-admins only see their own.
        $branchesQuery = Branch::query();
        if (!$user->is_admin && $user->employee) {
            // CORRECTED: Filter branches using the consistent employee relationship.
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        $itemsQuery = InventoryItem::query()->orderBy('name');

        return Inertia::render('Inventory/Batches/Create', [
            'items' => $itemsQuery->get(['id', 'name', 'unit', 'tracking_type']),
            'branches' => $branchesQuery->orderBy('name')->get(['id', 'name']),
            'preselectedItem' => $preselectedItem,
            'preselectedBranch' => $preselectedBranch,
            'isBranchLocked' => $isBranchLocked,
            'isItemLocked' => $isItemLocked, // <-- Pass the new prop
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInventoryBatchRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $batch = $this->inventoryService->createBatch($validated);

            $message = 'Batch created successfully.';

            if ($request->input('action') === 'save_and_add_another') {
                return redirect()->route('inventory.batches.create', [
                        'item_id' => $validated['inventory_item_id'],
                        'branch_id' => $validated['branch_id'],
                    ])
                   ->with('success', $message)
                    ->with('old', $request->only('branch_id', 'source'));
            }

            // CRITICAL FIX: Add the branch_id to the redirect route to maintain context.
            return redirect()->route('inventory.items.batches.index', [
                'item' => $validated['inventory_item_id'],
                'branch' => $validated['branch_id']
            ])->with('success', $message);
        } catch (\Exception $e) {
            Log::error('Batch creation failed: '.$e->getMessage());

            return back()->with('error', 'There was a problem creating the batch. Please try again.')->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryBatch $batch)
    {
        $this->authorize('view', $batch);
        $batch->load(['inventoryItem.category', 'branch', 'portions']);

        return Inertia::render('Inventory/Batches/Show', [
            'batch' => $batch,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(InventoryBatch $batch): Response
    {
        $this->authorize('update', $batch);
        $user = Auth::user();
        $batch->load('inventoryItem');

        $branchesQuery = Branch::query();
        if (!$user->is_admin && $user->employee) {
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        return Inertia::render('Inventory/Batches/Edit', [
            'batch' => $batch,
            'inventoryItems' => InventoryItem::all(['id', 'name', 'unit', 'tracking_type']),
            'branches' => $branchesQuery->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInventoryBatchRequest $request, InventoryBatch $batch): RedirectResponse
    {
        $this->authorize('update', $batch);
        $batch->update($request->validated());

        return redirect()->route('inventory.items.batches.index', ['item' => $batch->inventory_item_id])->with('success', 'Batch updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryBatch $batch): RedirectResponse
    {
        $this->authorize('delete', $batch);
        $itemId = $batch->inventory_item_id;
        $batch->delete();

        return redirect()->route('inventory.items.batches.index', ['item' => $itemId])->with('success', 'Batch deleted successfully.');
    }
 public function getAvailablePortions(InventoryBatch $batch): JsonResponse
    {
        $this->authorize('view', $batch);

        $portions = $batch->portions()
            ->where('status', PortionStatus::UNUSED)
            ->orderBy('portion_number', 'asc')
            ->get(['id', 'label']);

        return response()->json($portions);
    }
/**
 * Correct the initial count for a batch.
 */
public function correctCount(CorrectBatchCountRequest $request, InventoryBatch $batch): RedirectResponse
{
    $this->authorize('correctCount', $batch);

    $validated = $request->validated();
    $oldQuantity = $batch->quantity_received;
    $newQuantity = (float)$validated['corrected_quantity'];

    try {
        $this->inventoryService->correctBatchQuantity(
            $batch,
            $newQuantity,
            $validated['reason'],
            $request->user()
        );

        return redirect()->route('inventory.batches.show', $batch->id)
            ->with('success', "Batch initial count corrected from {$oldQuantity} to {$newQuantity}.");
    } catch (\Exception $e) {
        Log::error('Batch count correction failed: ' . $e->getMessage());
        return back()->withErrors(['error' => 'Failed to correct batch count: ' . $e->getMessage()]);
    }
}
}
