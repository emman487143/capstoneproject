<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\InventoryLog;
use App\Services\LogDetailFormatter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InventoryLogController extends Controller
{
    protected LogDetailFormatter $logDetailFormatter;

    public function __construct(LogDetailFormatter $logDetailFormatter)
    {
        $this->logDetailFormatter = $logDetailFormatter;
    }

    /**
     * Display a listing of the resource.
     * This will be our new, filterable, unified inventory log.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $branches = collect();
        $currentBranch = null;
        $selectedBranchId = null;

        // 1. Determine branch context, mirroring InventoryController logic for consistency.
        if ($user->is_admin) {
            $branches = Branch::query()->select('id', 'name')->orderBy('name')->get();
            $requestedBranchId = $request->input('branch');

            if ($requestedBranchId && $branches->contains('id', $requestedBranchId)) {
                $selectedBranchId = $requestedBranchId;
                $currentBranch = $branches->firstWhere('id', (int) $requestedBranchId);
            } elseif ($branches->isNotEmpty()) {
                // Default to the first branch if an admin hasn't selected one.
                $selectedBranchId = $branches->first()->id;
                $currentBranch = $branches->first();
            }
       } else {
            // Staff users are always locked to their assigned branch.
            // CORRECTED: Access the branch through the employee relationship for consistency.
            $employee = $user->employee;
            if ($employee && $employee->branch) {
                $selectedBranchId = $employee->branch_id;
                $currentBranch = $employee->branch;
                $branches = collect([$currentBranch]);
            }
        }
        // 2. Build the log query.
        $query = InventoryLog::query();

        // 3. Apply branch filtering for all users based on the determined context.
        if ($selectedBranchId) {
            $query->whereHas('batch', function ($q) use ($selectedBranchId) {
                $q->where('branch_id', $selectedBranchId);
            });
        } else {
            // If no branch context exists (e.g., admin with no branches), show no logs.
            $query->whereRaw('1 = 0');
        }

        // Apply action filtering
        $actionFilter = $request->input('action');
        if ($actionFilter && $actionFilter !== 'all') {
            $query->where('action', $actionFilter);
        }

        // Eager load all necessary relationships for both
        // batch-level and portion-level logs to prevent N+1 queries.
        $query->with([
            'user:id,name',
            'batch.inventoryItem:id,name,tracking_type,unit', // Added tracking_type and unit
            'portion.batch.inventoryItem:id,name,tracking_type,unit', // Added tracking_type and unit
        ]);

        $logs = $query->latest()->paginate(15)->withQueryString();

        // Format log details for display
        $logs->through(function ($log) {
            // Add formatted details using our formatter service
            $log->formatted_details = $this->logDetailFormatter->format($log);

            // IMPORTANT: Also include the raw details for the frontend to access directly
            $log->parsed_details = is_string($log->details) ? json_decode($log->details, true) : $log->details;

            return $log;
        });

        return Inertia::render('Inventory/Log/Index', [
            'logs' => $logs,
            'branches' => $branches,
            'currentBranch' => $currentBranch,
            'filters' => $request->only(['action', 'branch']),
        ]);
    }
}
