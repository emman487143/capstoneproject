<?php

namespace App\Http\Controllers;

use App\Enums\Inventory\LogAction;
use App\Enums\Transfers\TransferStatus;
use App\Models\Branch;
use App\Models\Dashboard;
use App\Models\InventoryBatchPortion;
use App\Models\InventoryItem;
use App\Models\InventoryLog;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Transfer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

use function Laravel\Prompts\alert;

class DashboardController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        // Ensure the user has access to the dashboard before proceeding

    }

    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {



        /** @var User $user */
        $user = Auth::user();
        $branches = collect();
        $currentBranch = null;
        $selectedBranchId = null;

        if($user->role === 'staff') {
           dd("Access denied. Staff members do not have access to the dashboard.");
        }

        // Only owners can see all branches, managers can only see their assigned branch
        if ($user->role === 'owner') {
            $branches = Branch::orderBy('name')->get();
            $requestedBranchId = $request->input('branch');

            if ($requestedBranchId && $branches->contains('id', $requestedBranchId)) {
                $selectedBranchId = (int) $requestedBranchId;
                $currentBranch = $branches->firstWhere('id', $selectedBranchId);
            } elseif ($branches->isNotEmpty()) {
                $currentBranch = $branches->first();
                $selectedBranchId = $currentBranch->id;
            }
        } else {
            // Manager role - restricted to their branch
            if ($user->branch) {
                $currentBranch = $user->branch;
                $selectedBranchId = $currentBranch->id;
                $branches = collect([$currentBranch]);
            }
        }

        $stats = [
            'lowStockCount' => 0,
            'expiringSoonCount' => 0,
            'salesTodayCount' => 0,
            'outOfStockCount' => 0,
            'inventoryValue' => 0,
            'inventoryHealthScore' => 0,
        ];

        $recentInventoryLogs = collect();
        $recentSale = null;
        $recentTransfer = null;
        $salesData = [];
        $bestSellerProducts = [];
        $bestSellerAddons = [];
        $lowStockItems = [];
        $expiringSoonItems = [];

        if ($selectedBranchId) {
            // Calculate statistics
            $lowStockCount = InventoryItem::whereHas('branches', function ($query) use ($selectedBranchId) {
                $query->where('branch_id', $selectedBranchId)
                      ->where('low_stock_threshold', '>', 0);
            })
            ->withSum(['batches' => function ($query) use ($selectedBranchId) {
                $query->where('branch_id', $selectedBranchId);
            }], 'remaining_quantity')
            ->get()
            ->filter(function ($item) use ($selectedBranchId) {
                $pivot = $item->branches()->where('branch_id', $selectedBranchId)->first()->pivot;
                $currentStock = $item->batches_sum_remaining_quantity ?? 0;
                return $currentStock > 0 && $currentStock <= $pivot->low_stock_threshold;
            });

            $lowStockItems = $lowStockCount->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'current_stock' => $item->batches_sum_remaining_quantity ?? 0,
                    'threshold' => $item->branches->first()->pivot->low_stock_threshold,
                    'unit' => $item->unit,
                ];
            })->take(5);

            // Get expiring soon items
            $expiringBatches = InventoryBatch::where('branch_id', $selectedBranchId)
                ->join('inventory_items', 'inventory_batches.inventory_item_id', '=', 'inventory_items.id')
                ->whereNotNull('inventory_batches.expiration_date')
                ->whereRaw('inventory_batches.expiration_date <= DATE_ADD(NOW(), INTERVAL inventory_items.days_to_warn_before_expiry DAY)')
                ->whereRaw('inventory_batches.expiration_date >= NOW()')
                ->where('remaining_quantity', '>', 0)
                ->select(
                    'inventory_items.id as item_id',
                    'inventory_items.name as item_name',
                    'inventory_batches.id as batch_id',
                    'inventory_batches.expiration_date',
                    'inventory_batches.remaining_quantity',
                    'inventory_items.unit'
                )
                ->orderBy('inventory_batches.expiration_date')
                ->get();

            $expiringSoonItems = $expiringBatches->take(5)->map(function($batch) {
                return [
                    'id' => $batch->item_id,
                    'batch_id' => $batch->batch_id,
                    'name' => $batch->item_name,
                    'expiration_date' => $batch->expiration_date,
                    'remaining' => $batch->remaining_quantity,
                    'unit' => $batch->unit,
                    'days_left' => Carbon::now()->diffInDays(Carbon::parse($batch->expiration_date)),
                ];
            });

            $stats = [
                'lowStockCount' => $lowStockCount->count(),
                'expiringSoonCount' => $expiringBatches->count(),
                'salesTodayCount' => Sale::where('branch_id', $selectedBranchId)
                    ->whereDate('created_at', Carbon::today())
                    ->count(),
                'outOfStockCount' => InventoryItem::whereHas('branches', function ($query) use ($selectedBranchId) {
                    $query->where('branch_id', $selectedBranchId);
                })
                ->whereDoesntHave('batches', function ($query) use ($selectedBranchId) {
                    $query->where('branch_id', $selectedBranchId)
                          ->where('remaining_quantity', '>', 0);
                })
                ->count(),
                'inventoryValue' => InventoryBatch::where('branch_id', $selectedBranchId)
                    ->where('remaining_quantity', '>', 0)
                    ->sum(DB::raw('remaining_quantity * unit_cost')),
                'inventoryHealthScore' => $this->calculateInventoryHealthScore($selectedBranchId),
            ];

            // Get recent activity logs
            $recentInventoryLogs = InventoryLog::with([
                    'user:id,name',
                    'portion.batch.inventoryItem:id,name,tracking_type,unit',
                    'batch.inventoryItem:id,name,tracking_type,unit',
                ])
                ->where(function ($query) use ($selectedBranchId) {
                    $query->whereHas('portion', function ($q) use ($selectedBranchId) {
                        $q->where('current_branch_id', $selectedBranchId);
                    })
                    ->orWhereHas('batch', function ($q) use ($selectedBranchId) {
                        $q->where('branch_id', $selectedBranchId);
                    });
                })
                ->latest()
                ->take(10)
                ->get()
                ->map(function ($log) {
                    // Use your LogDetailFormatter if available, otherwise mimic its output
                    $log->formatted_details = app(\App\Services\LogDetailFormatter::class)->format($log);
                    $log->parsed_details = is_string($log->details) ? json_decode($log->details, true) : $log->details;
                    return $log;
                });

            // Get recent sale
            $recentSale = Sale::where('branch_id', $selectedBranchId)
                ->with('user:id,name')
                ->latest()
                ->first();

            if ($recentSale) {
                $recentSale = [
                    'id' => $recentSale->id,
                    'type' => 'sale',
                    'action' => 'sale_recorded',
                    'details' => [
                        'title' => 'Sale #' . $recentSale->id,
                        'description' => 'Sale recorded for ' . $currentBranch->name,
                        'quantityInfo' => '₱' . number_format($recentSale->total_amount, 2) . ' · ' . $recentSale->items_count . ' items',
                    ],
                    'created_at' => $recentSale->created_at->toDateTimeString(),
                    'user' => $recentSale->user,
                ];
            }

            // Get recent transfer
            $recentTransfer = Transfer::where(function($query) use ($selectedBranchId) {
                    $query->where('source_branch_id', $selectedBranchId)
                        ->orWhere('destination_branch_id', $selectedBranchId);
                })
                ->with(['user:id,name', 'sourceBranch:id,name', 'destinationBranch:id,name'])
                ->latest()
                ->first();

            if ($recentTransfer) {
                $isOutgoing = $recentTransfer->source_branch_id == $selectedBranchId;
                $recentTransfer = [
                    'id' => $recentTransfer->id,
                    'type' => 'transfer',
                    'action' => $isOutgoing ? 'transfer_out' : 'transfer_in',
                    'status' => $recentTransfer->status->value,
                    'details' => [
                        'title' => $isOutgoing ? 'Outgoing Transfer' : 'Incoming Transfer',
                        'description' => $isOutgoing
                            ? 'To: ' . $recentTransfer->destinationBranch->name
                            : 'From: ' . $recentTransfer->sourceBranch->name,
                        'quantityInfo' => 'Transfer #' . $recentTransfer->id . ' · ' . $recentTransfer->items_count . ' items',
                    ],
                    'created_at' => $recentTransfer->created_at->toDateTimeString(),
                    'user' => $recentTransfer->user,
                ];
            }

            // Get sales data for charts
            $salesData = [
                'daily' => $this->getDailySalesData($selectedBranchId),
                'weekly' => $this->getWeeklySalesData($selectedBranchId),
                'monthly' => $this->getMonthlySalesData($selectedBranchId),
            ];

            // Get best seller products and addons
            $bestSellerProducts = $this->getBestSellerProducts($selectedBranchId, false);
            $bestSellerAddons = $this->getBestSellerProducts($selectedBranchId, true);
        }

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentInventoryLogs' => $recentInventoryLogs,
            'recentSale' => $recentSale,
            'recentTransfer' => $recentTransfer,
            'branches' => $branches,
            'currentBranch' => $currentBranch,
            'salesData' => $salesData,
            'bestSellerProducts' => $bestSellerProducts,
            'bestSellerAddons' => $bestSellerAddons,
            'lowStockItems' => $lowStockItems,
            'expiringSoonItems' => $expiringSoonItems,
        ]);
    }

    /**
     * Format activity log details into a consistent format.
     */
    private function formatActivityDetails(InventoryLog $log): array
    {
        $details = $log->details;
        $itemName = $log->portion?->batch?->inventoryItem?->name ?? 'Unknown Item';

        $title = match ($log->action) {
            LogAction::BATCH_CREATED => 'Batch Created',
            LogAction::DEDUCTED_FOR_SALE => 'Used in Sale',
            LogAction::TRANSFER_RECEIVED => 'Transfer Received',
            LogAction::TRANSFER_INITIATED => 'Transfer Initiated',
            LogAction::ADJUSTMENT_WASTE => 'Waste Adjustment',
            default => 'Inventory Update',
        };

        $description = match ($log->action) {
            LogAction::BATCH_CREATED => "Received batch of {$itemName}",
            LogAction::DEDUCTED_FOR_SALE => "Used {$itemName} in sale",
            LogAction::TRANSFER_RECEIVED => "Received {$itemName} from " . ($details['source_branch_name'] ?? 'another branch'),
            LogAction::TRANSFER_INITIATED => "Transferred {$itemName} to " . ($details['destination_branch_name'] ?? 'another branch'),
            LogAction::ADJUSTMENT_WASTE => "Marked {$itemName} as waste",
            default => 'Log entry details unavailable.',
        };

        $quantityInfo = match ($log->action) {
            LogAction::BATCH_CREATED => ($details['quantity_received'] ?? 'N/A') . " units",
            LogAction::DEDUCTED_FOR_SALE => "Sale #" . ($details['sale_id'] ?? 'N/A'),
            LogAction::TRANSFER_RECEIVED, LogAction::TRANSFER_INITIATED => "Transfer #" . ($details['transfer_id'] ?? 'N/A'),
            LogAction::ADJUSTMENT_WASTE => "Reason: " . ($details['reason'] ?? 'unspecified'),
            default => '',
        };

        return [
            'title' => $title,
            'description' => $description,
            'quantityInfo' => $quantityInfo,
        ];
    }

    /**
     * Calculate an inventory health score based on multiple factors.
     */
    private function calculateInventoryHealthScore(int $branchId): int
    {
        // This is a simplified calculation that could be expanded
        $totalItems = InventoryItem::whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId);
        })->count();

        if ($totalItems === 0) return 100;

        $lowStockItems = InventoryItem::whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)
                  ->where('low_stock_threshold', '>', 0);
        })
        ->withSum(['batches' => function ($query) use ($branchId) {
            $query->where('branch_id', $branchId);
        }], 'remaining_quantity')
        ->get()
        ->filter(function ($item) use ($branchId) {
            $pivot = $item->branches()->where('branch_id', $branchId)->first()->pivot;
            $currentStock = $item->batches_sum_remaining_quantity ?? 0;
            return $currentStock > 0 && $currentStock <= $pivot->low_stock_threshold;
        })->count();

        $outOfStockItems = InventoryItem::whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId);
        })
        ->whereDoesntHave('batches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)
                  ->where('remaining_quantity', '>', 0);
        })
        ->count();

        $expiringItems = InventoryBatch::where('branch_id', $branchId)
            ->join('inventory_items', 'inventory_batches.inventory_item_id', '=', 'inventory_items.id')
            ->whereNotNull('inventory_batches.expiration_date')
            ->whereRaw('inventory_batches.expiration_date <= DATE_ADD(NOW(), INTERVAL inventory_items.days_to_warn_before_expiry DAY)')
            ->whereRaw('inventory_batches.expiration_date >= NOW()')
            ->count();

        // The fewer problems, the higher the score
        $problemItems = $lowStockItems + $outOfStockItems + $expiringItems;
        $score = 100 - (($problemItems / $totalItems) * 100);

        return max(0, min(100, (int)$score));
    }

    /**
     * Get daily sales data for the chart (last 7 days).
     */
    private function getDailySalesData(int $branchId): array
    {
        $days = 7;
        $salesData = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $sales = Sale::where('branch_id', $branchId)
                ->whereDate('created_at', $date->toDateString())
                ->sum('total_amount');

            $salesData[] = [
                'date' => $date->format('M d'),
                'value' => (float)$sales,
            ];
        }

        return $salesData;
    }

    /**
     * Get weekly sales data for the chart (last 10 weeks).
     */
    private function getWeeklySalesData(int $branchId): array
    {
        $weeks = 10;
        $salesData = [];

        for ($i = $weeks - 1; $i >= 0; $i--) {
            $startDate = Carbon::now()->startOfWeek()->subWeeks($i);
            $endDate = (clone $startDate)->endOfWeek();

            $sales = Sale::where('branch_id', $branchId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('total_amount');

            $salesData[] = [
                'date' => 'Week ' . ($weeks - $i),
                'value' => (float)$sales,
            ];
        }

        return $salesData;
    }

    /**
     * Get monthly sales data for the chart (last 7 months).
     */
    private function getMonthlySalesData(int $branchId): array
    {
        $months = 7;
        $salesData = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $startDate = (clone $date)->startOfMonth();
            $endDate = (clone $date)->endOfMonth();

            $sales = Sale::where('branch_id', $branchId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('total_amount');

            $salesData[] = [
                'date' => $date->format('M'),
                'value' => (float)$sales,
            ];
        }

        return $salesData;
    }

    /**
     * Get best selling products or addons.
     */
    private function getBestSellerProducts(int $branchId, bool $isAddon): array
    {
        return SaleItem::select(
                'products.id',
                'products.name',
                DB::raw('SUM(sale_items.quantity) as quantity_sold'),
                // Use the product price from products table instead of sale_items.price
                DB::raw('SUM(sale_items.quantity * products.price) as total_amount')
            )
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.branch_id', $branchId)
            ->where('products.is_addon', $isAddon)
            ->whereDate('sales.created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('quantity_sold')
            ->limit(5)
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'quantity' => (int)$item->quantity_sold,
                    'total' => (float)$item->total_amount,
                ];
            })->toArray();
    }
}
