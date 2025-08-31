<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Display the operational, branch-centric inventory management page.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $this->authorize('viewAny', [InventoryBatch::class]);

        $request->validate([
            'status' => 'nullable|string|in:low_stock,out_of_stock,expiring_soon',
            'category' => 'nullable|integer|exists:inventory_categories,id',
            'branch' => 'nullable|integer|exists:branches,id',
            'search' => 'nullable|string|max:255',
        ]);

        $selectedBranchId = null;
        $branches = collect();
        $currentBranch = null;

        if ($user->is_admin) {
            $branches = Branch::query()->select('id', 'name')->orderBy('name')->get();
            $requestedBranchId = $request->input('branch');

            if ($requestedBranchId && $branches->contains('id', $requestedBranchId)) {
                $selectedBranchId = $requestedBranchId;
                $currentBranch = $branches->firstWhere('id', $selectedBranchId);
            } else {
                $selectedBranchId = $branches->first()?->id;
                $currentBranch = $branches->first();
            }
        } else {
            $employee = $user->employee;
            if ($employee && $employee->branch_id) {
                $selectedBranchId = $employee->branch_id;
                $currentBranch = $employee->branch()->first(['id', 'name']);
                if ($currentBranch) {
                    $branches = collect([$currentBranch]);
                }
            }
        }

        if (!$selectedBranchId) {
            return Inertia::render('Inventory/Index', [
                'items' => fn () => (object) ['data' => [], 'meta' => ['links' => []]],
                'branches' => $branches,
                'currentBranch' => $currentBranch,
                'filters' => $request->only(['branch', 'search', 'category', 'status']),
                'categories' => fn () => InventoryCategory::query()->orderBy('name')->get(['id', 'name']),
                'stats' => ['lowStockCount' => 0, 'expiringSoonCount' => 0],
            ]);
        }

        // --- DEFINITIVE STATS CALCULATION ---
        $lowStockCount = InventoryItem::query()
            ->join('branch_inventory_item as bi_stats', function ($join) use ($selectedBranchId) {
                $join->on('inventory_items.id', '=', 'bi_stats.inventory_item_id')
                     ->where('bi_stats.branch_id', '=', $selectedBranchId);
            })
            ->selectRaw('inventory_items.id, bi_stats.low_stock_threshold, SUM(ib.remaining_quantity) as current_stock')
            ->leftJoin('inventory_batches as ib', function ($join) use ($selectedBranchId) {
                $join->on('inventory_items.id', '=', 'ib.inventory_item_id')
                     ->where('ib.branch_id', '=', $selectedBranchId);
            })
            ->groupBy('inventory_items.id', 'bi_stats.low_stock_threshold')
            ->havingRaw('current_stock > 0 AND current_stock <= bi_stats.low_stock_threshold')
            ->get()->count();

        $expiringSoonCount = InventoryItem::query()
            ->whereHas('branches', fn ($q) => $q->where('branches.id', $selectedBranchId))
            ->whereHas('batches', fn ($q) => $q->where('branch_id', $selectedBranchId)
                ->whereNotNull('expiration_date')
                ->whereRaw('expiration_date <= DATE_ADD(NOW(), INTERVAL inventory_items.days_to_warn_before_expiry DAY)')
            )->count();


        $outOfStockCount = InventoryItem::query()
    ->join('branch_inventory_item as bi_stats', function ($join) use ($selectedBranchId) {
        $join->on('inventory_items.id', '=', 'bi_stats.inventory_item_id')
             ->where('bi_stats.branch_id', '=', $selectedBranchId);
    })
    ->leftJoin('inventory_batches as ib', function ($join) use ($selectedBranchId) {
        $join->on('inventory_items.id', '=', 'ib.inventory_item_id')
             ->where('ib.branch_id', '=', $selectedBranchId);
    })
    ->selectRaw('inventory_items.id, SUM(ib.remaining_quantity) as current_stock')
    ->groupBy('inventory_items.id')
    ->havingRaw('current_stock IS NULL OR current_stock <= 0')
    ->get()->count();

        // --- MAIN QUERY WITH SUBQUERIES INSTEAD OF HAVING ---
        $itemsQuery = InventoryItem::query()
    ->with('category:id,name')
    // Keep existing select fields
    ->select([
        'inventory_items.id',
        'inventory_items.name',
        'inventory_items.code',
        'inventory_items.description',
        'inventory_items.inventory_category_id',
        'inventory_items.unit',
        'inventory_items.tracking_type',
        'inventory_items.days_to_warn_before_expiry',
        'inventory_items.created_at',
        'inventory_items.updated_at',
        'bi.low_stock_threshold'
    ])
    ->join('branch_inventory_item as bi', function ($join) use ($selectedBranchId) {
        $join->on('inventory_items.id', '=', 'bi.inventory_item_id')
             ->where('bi.branch_id', '=', $selectedBranchId);
    })
    ->addSelect([
        'batches_sum_remaining_quantity' => InventoryBatch::query()
            ->selectRaw('SUM(remaining_quantity)')
            ->whereColumn('inventory_batches.inventory_item_id', 'inventory_items.id')
            ->where('branch_id', $selectedBranchId),
        // Modified to select both expiration_date and batch_number
        'next_expiring_batch' => InventoryBatch::query()
            ->selectRaw("CONCAT(batch_number, '|', expiration_date)") // Combine batch_number and date
            ->whereColumn('inventory_batches.inventory_item_id', 'inventory_items.id')
            ->where('branch_id', $selectedBranchId)
            ->where('remaining_quantity', '>', 0) // Only consider batches with stock
            ->whereNotNull('expiration_date')
            ->whereRaw('expiration_date <= DATE_ADD(NOW(), INTERVAL inventory_items.days_to_warn_before_expiry DAY)')
            ->orderBy('expiration_date', 'asc')
            ->limit(1),
        // When calculating the total value, ensure we're using unit_cost * remaining_quantity
        'total_value' => InventoryBatch::query()
            ->selectRaw('SUM(remaining_quantity * unit_cost)')
            ->whereColumn('inventory_batches.inventory_item_id', 'inventory_items.id')
            ->where('branch_id', $selectedBranchId),
    ]);

        $itemsQuery->when($request->input('search'), function ($query, $search) {
            $query->where(fn ($q) => $q->where('inventory_items.name', 'like', "%{$search}%")
                ->orWhere('inventory_items.description', 'like', "%{$search}%"));
        });

        $itemsQuery->when($request->input('category'), function ($query, $categoryId) {
            $query->where('inventory_items.inventory_category_id', $categoryId);
        });

        // Using WHERE clauses with subqueries instead of HAVING
        $itemsQuery->when($request->input('status'), function ($query, $status) use ($selectedBranchId) {
            match ($status) {
                'low_stock' => $query->whereRaw('(SELECT SUM(remaining_quantity) FROM inventory_batches
                                         WHERE inventory_item_id = inventory_items.id
                                         AND branch_id = ?) > 0', [$selectedBranchId])
                                     ->whereRaw('(SELECT SUM(remaining_quantity) FROM inventory_batches
                                         WHERE inventory_item_id = inventory_items.id
                                         AND branch_id = ?) <= bi.low_stock_threshold', [$selectedBranchId]),
                'out_of_stock' => $query->whereRaw('NOT EXISTS (SELECT 1 FROM inventory_batches
                                          WHERE inventory_item_id = inventory_items.id
                                          AND branch_id = ?
                                          AND remaining_quantity > 0)', [$selectedBranchId]),
                'expiring_soon' => $query->whereExists(function ($query) use ($selectedBranchId) {
                    $query->select(DB::raw(1))
                          ->from('inventory_batches')
                          ->whereColumn('inventory_batches.inventory_item_id', 'inventory_items.id')
                          ->where('branch_id', $selectedBranchId)
                          ->whereNotNull('expiration_date')
                          ->whereRaw('expiration_date <= DATE_ADD(NOW(), INTERVAL inventory_items.days_to_warn_before_expiry DAY)');
                }),
                default => null,
            };
        });

        $items = $itemsQuery->orderBy('inventory_items.name')->paginate(20)->withQueryString();

       $items->getCollection()->transform(function ($item) {
    $item->current_stock = $item->batches_sum_remaining_quantity ?? 0;

    // Process the next_expiring_batch field
    $expiringBatchInfo = null;
    if ($item->next_expiring_batch) {
        list($batchNumber, $expirationDate) = explode('|', $item->next_expiring_batch);
        $expiringBatchInfo = [
            'batch_number' => $batchNumber,
            'expiration_date' => $expirationDate
        ];
        $formattedDate = date('M j', strtotime($expirationDate));
    }

    $item->is_expiring_soon = !is_null($expiringBatchInfo);
    $item->expiring_batch = $expiringBatchInfo;

    // Set status with priority logic
    if ($item->current_stock <= 0) {
        $item->status = 'Out of Stock';
    } elseif ($expiringBatchInfo) {
        $item->status = "Expiring Soon (Batch #{$batchNumber}, {$formattedDate})";
    } elseif ($item->low_stock_threshold > 0 && $item->current_stock <= $item->low_stock_threshold) {
        $item->status = 'Low Stock';
    } else {
        $item->status = 'In Stock';
    }

    return $item;
});

        return Inertia::render('Inventory/Index', [
            'items' => $items,
            'branches' => $branches,
            'currentBranch' => $currentBranch,
            'filters' => $request->only(['branch', 'search', 'category', 'status']),
            'categories' => fn () => InventoryCategory::query()->orderBy('name')->get(['id', 'name']),
            'stats' => [
                'lowStockCount' => $lowStockCount,
                'expiringSoonCount' => $expiringSoonCount,
                'outOfStockCount' => $outOfStockCount,
            ],
        ]);
    }
}
