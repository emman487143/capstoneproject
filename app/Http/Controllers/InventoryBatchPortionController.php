<?php

namespace App\Http\Controllers;

use App\Enums\Inventory\LogAction;
use App\Enums\Inventory\PortionStatus;
use App\Models\InventoryBatch;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryLog;
use App\Http\Requests\RestorePortionsRequest;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryBatchPortionController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * Display a listing of portions for a batch.
     */
    public function index(Request $request, InventoryBatch $batch): Response
    {
        $this->authorize('view', $batch);

        return Inertia::render('Inventory/Batches/Portions/Index', [
            'batch' => $batch->load('inventoryItem.category'),
            'portions' => $batch->portions()->paginate(15),
        ]);
    }

    /**
     * Show the form for restoring adjusted portions.
     */
    public function restoreForm(InventoryBatch $batch): Response
    {
        $this->authorize('view', $batch);

        // Get all adjusted portions for this batch
        $adjustedPortions = $batch->portions()
            ->whereIn('status', [
                PortionStatus::SPOILED->value,
                PortionStatus::WASTED->value,
                PortionStatus::MISSING->value
            ])
            ->with(['logs' => function ($query) {
                $query->whereIn('action', [
                    LogAction::ADJUSTMENT_SPOILAGE->value,
                    LogAction::ADJUSTMENT_WASTE->value,
                    LogAction::ADJUSTMENT_THEFT->value,
                    LogAction::ADJUSTMENT_OTHER->value
                ])
                ->latest()
                ->limit(1);
            }])
            ->get()
            ->map(function ($portion) {
                // Get the latest adjustment log
                $log = $portion->logs->first();

                return [
                    'id' => $portion->id,
                    'label' => $portion->label,
                    'status' => $portion->status,
                    'adjustment_date' => $log ? $log->created_at->format('Y-m-d H:i:s') : null,
                    'adjustment_reason' => $log && isset($log->details['reason']) ? $log->details['reason'] : 'Unknown',
                    'adjustment_type' => $log ? $log->action : null,
                    'log_id' => $log ? $log->id : null,
                ];
            });

        return Inertia::render('Inventory/Batches/Portions/Restore', [
            'batch' => $batch->load('inventoryItem'),
            'adjustedPortions' => $adjustedPortions,
        ]);
    }

    /**
     * Restore portions that were previously adjusted out.
     */
    public function restore(RestorePortionsRequest $request, InventoryBatch $batch): RedirectResponse
    {
        $this->authorize('view', $batch);

        $validated = $request->validated();

        try {
            $this->inventoryService->restorePortions(
                $validated['portion_ids'],
                $validated['reason'],
                $request->user()
            );

            return redirect()->route('inventory.batches.show', $batch->id)
                ->with('success', count($validated['portion_ids']) . ' portions have been successfully restored.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to restore portions: ' . $e->getMessage()]);
        }
    }
}
