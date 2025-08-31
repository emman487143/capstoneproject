<?php

namespace App\Http\Controllers;

use App\Enums\Inventory\TrackingType;
use App\Enums\Inventory\PortionStatus;
use App\Http\Requests\StoreInventoryAdjustmentRequest;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Services\InventoryService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Throwable;

class InventoryAdjustmentController extends Controller
{
    public function __construct(protected InventoryService $inventoryService)
    {
    }

    /**
     * Show the form for creating a new inventory adjustment.
     * Handles both global and batch-specific contexts.
     */
     public function create(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();
        $branchId = $request->input('branch_id');
        $itemId = $request->input('item_id');
        $batchId = $request->input('batch_id');

        // If a specific batch is provided, derive the branch and item from it.
        // This ensures context is never lost when coming from a specific batch page.
        if ($batchId) {
            $batch = InventoryBatch::findOrFail($batchId);
            $branchId = $batch->branch_id;
            $itemId = $batch->inventory_item_id;
        }

        // Authorize based on the final, resolved branch_id.
        // This will throw an exception if no branch is selected, which is correct.
        $this->authorize('create', [InventoryBatch::class, $branchId]);

        // Start building the query for inventory items.
        $itemsQuery = InventoryItem::query()->orderBy('name');

        // If we have a specific item context, narrow the main query to only that item.
        // Otherwise, get all items that are stocked in the specified branch.
        if ($itemId) {
            $itemsQuery->where('id', $itemId);
        } else {
            $itemsQuery->whereHas('branches', fn ($q) => $q->where('branch_id', $branchId));
        }

        // Eager load batches and portions with the corrected logic.
        $itemsQuery->with([
            'batches' => function ($q) use ($branchId, $batchId) {
                $q->where('branch_id', $branchId); // Scope batches to the correct branch.

                // Group the next part of the query to ensure correct logic.
                // We want batches that have stock OR the specific batch we are adjusting.
                $q->where(function ($subQuery) use ($batchId) {
                    $subQuery->where('remaining_quantity', '>', 0);
                    if ($batchId) {
                        $subQuery->orWhere('id', $batchId);
                    }
                });

                // Always load the unused portions for the selected batches.
                $q->with(['portions' => fn ($p) => $p->where('status', PortionStatus::UNUSED)->select('id', 'label', 'inventory_batch_id')]);
            },
        ]);

        // DEFINITIVE FIX: Always provide the list of branches the user is authorized for.
        $branchesQuery = Branch::query()->orderBy('name');
        if (!$user->is_admin && $user->employee) {
            $branchesQuery->where('id', $user->employee->branch_id);
        }

        return Inertia::render('Inventory/Adjustments/Create', [
            'inventoryItems' => $itemsQuery->get(),
            'branches' => $branchesQuery->get(['id', 'name']),
            'preselectedItemId' => $itemId,
            'preselectedBatchId' => $batchId,
            'preselectedBranchId' => $branchId,
        ]);
    }

    /**
     * Store a newly created inventory adjustment.
     */
    public function store(StoreInventoryAdjustmentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $item = InventoryItem::findOrFail($validated['inventory_item_id']);

        try {
            // Authorization is now handled by the FormRequest and policies.
            // The controller's responsibility is to orchestrate the service call.
            if ($item->tracking_type === TrackingType::BY_PORTION) {
                $this->inventoryService->recordPortionAdjustment($validated, $user);
            } else { // BY_MEASURE
                $this->inventoryService->recordQuantityAdjustment($validated, $user);
            }
        } catch (AuthorizationException $e) {
            Log::warning('Inventory Adjustment Authorization Failed: ' . $e->getMessage(), ['user_id' => $user->id, 'data' => $validated]);
            return back()->with('error', 'You are not authorized to perform this adjustment.');
        } catch (InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage())->withInput();
        } catch (Throwable $e) {
            Log::error('Inventory Adjustment Error: ' . $e->getMessage(), ['exception' => $e]);
            return back()->with('error', 'An unexpected error occurred. Please try again.')->withInput();
        }

        return redirect()->route('inventory.index')->with('success', 'Inventory adjustment recorded successfully.');
    }
}
