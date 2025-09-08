<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\Transfer;
use App\Http\Requests\StoreTransferRequest;
use App\Http\Requests\ReceiveTransferRequest;
use App\Http\Requests\UpdateTransferRequest;
use App\Services\TransferService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    /**
     * Apply the policy to all resource methods.
     */
    public function __construct()
    {
        $this->authorizeResource(Transfer::class, 'transfer');
    }
 //sd
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $query = Transfer::query()
            ->with(['sourceBranch:id,name', 'destinationBranch:id,name', 'sendingUser:id,name'])
            ->latest('sent_at');

        // Scope transfers to the user's branch unless they are an admin or owner
        if (!$user->is_admin && $user->role !== 'owner') {
            if ($user->employee?->branch_id) {
                $query->where(function ($q) use ($user) {
                    $q->where('source_branch_id', $user->employee->branch_id)
                      ->orWhere('destination_branch_id', $user->employee->branch_id);
                });
            } else {
                // A regular user without a branch sees no transfers
                $query->whereRaw('1 = 0');
            }
        }

        return Inertia::render('Transfers/Index', [
            'transfers' => $query->paginate(15)->withQueryString(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
   public function create(): Response|RedirectResponse
    {
        $user = Auth::user();

        // Admin workflow: Admins can choose any branch as the source.
        if ($user->is_admin) {
            $allBranches = Branch::orderBy('name')->get(['id', 'name']);

            return Inertia::render('Transfers/Create', [
                'currentBranch' => null, // Admin has no default branch
                'sourceBranches' => $allBranches, // Provide all branches for selection
                'destinationBranches' => $allBranches,
            ]);
        }

        // Staff workflow: Staff are locked to their assigned branch.
        // CORRECTED: Use the established employee->branch relationship.
        $currentBranch = $user->employee?->branch;

        if (!$currentBranch) {
            // A non-admin user MUST belong to a branch to initiate a transfer.
            return redirect()->route('dashboard')->with('error', 'You must be assigned to a branch to manage transfers.');
        }

        // A user can only transfer to other branches, not their own.
        $destinationBranches = Branch::where('id', '!=', $currentBranch->id)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Transfers/Create', [
            'currentBranch' => $currentBranch->only('id', 'name'),
            'sourceBranches' => [], // Not needed for staff
            'destinationBranches' => $destinationBranches,
        ]);
    }

    public function getInventoryForTransfer(Branch $branch): JsonResponse
    {
        $this->authorize('create', Transfer::class);

        $items = InventoryItem::whereHas('batches', function ($query) use ($branch) {
            $query->where('branch_id', $branch->id)
                  ->where('remaining_quantity', '>', 0);
        })
        // CORRECTED: Removed 'unit' from the eager loading array.
        // 'unit' is an attribute on the InventoryItem model, not a relationship.
        ->with(['batches' => function ($query) use ($branch) {
            $query->where('branch_id', $branch->id)
                  ->where('remaining_quantity', '>', 0)
                  ->orderBy('expiration_date', 'asc');
        }])
        ->orderBy('name')
        ->get();

        return response()->json($items);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTransferRequest $request, TransferService $transferService): RedirectResponse
    {
        $transfer = $transferService->initiateTransfer(
            $request->validated(),
            $request->user()
        );

        return redirect()->route('inventory.transfers.show', $transfer)
            ->with('success', "Transfer #{$transfer->id} initiated successfully.");
    }

    /**
     * Display the specified resource.
     */
    public function show(Transfer $transfer): Response
    {
        // CORRECTED: Pass the specific $transfer instance to the authorize method.
        // This provides the policy with the model it needs to check, fixing the ArgumentCountError.
        $this->authorize('view', $transfer);

        $transfer->load([
            // CORRECTED: We only need to load 'inventoryItem'. The 'unit' attribute
            // is a direct column on that model and will be loaded with it.
            'items.inventoryItem',
            'items.inventoryBatch',
            'items.inventoryBatchPortion',
            'sourceBranch',
            'destinationBranch',
            'sendingUser',
            'receivingUser',
        ]);

       return Inertia::render('Transfers/Show', [
            'transfer' => $transfer,
            // CORRECTED: The `cancel` policy also needs the specific $transfer instance
            // to check its status, just like the `update` policy.
            'can' => [
                'update' => Auth::user()->can('update', $transfer),
                'cancel' => Auth::user()->can('cancel', $transfer),
            ],
        ]);
    }

    /**
     * Update the specified resource in storage (i.e., receive the transfer).
     */
   public function update(ReceiveTransferRequest $request, Transfer $transfer, TransferService $transferService): RedirectResponse
    {
        // The TransferService will handle the complex logic of receiving items,
        // creating new inventory batches, and logging all events.
        $transferService->receiveTransfer(
            transfer: $transfer,
            receptionData: $request->validated(),
            receivingUser: $request->user()
        );

        // CORRECTED: The route name is 'inventory.transfers.show'.
        return redirect()->route('inventory.transfers.show', $transfer)
            ->with('success', "Transfer #{$transfer->id} has been successfully received and processed.");
    }

       /**
     * Cancel a pending transfer.
     */
    public function cancel(Transfer $transfer, TransferService $transferService): RedirectResponse
    {
        $this->authorize('cancel', $transfer);

        $transferService->cancelTransfer($transfer, Auth::user());

        return redirect()->route('inventory.transfers.show', $transfer)
            ->with('success', "Transfer #{$transfer->id} has been successfully cancelled.");
    }
    public function reject(Request $request, Transfer $transfer, TransferService $transferService): RedirectResponse
{
    $this->authorize('update', $transfer);

    $validated = $request->validate([
        'rejection_reason' => 'required|string|min:5|max:1000',
    ]);

    $transferService->rejectTransfer(
        $transfer,
        Auth::user(),
        $validated['rejection_reason']
    );

    return redirect()->route('inventory.transfers.show', $transfer)
        ->with('success', "Transfer #{$transfer->id} has been rejected. All items have been returned to the source branch.");
}

public function receive(Transfer $transfer): Response
{
    $this->authorize('update', $transfer);

    $transfer->load([
        'items.inventoryItem',
        'items.inventoryBatch',
        'items.inventoryBatchPortion',
        'sourceBranch',
        'destinationBranch',
        'sendingUser',
        'receivingUser',
    ]);

    return Inertia::render('Transfers/Receive', [
        'transfer' => $transfer,
        'can' => [
            'update' => Auth::user()->can('update', $transfer),
            'cancel' => Auth::user()->can('cancel', $transfer),
        ],
    ]);
}
}
