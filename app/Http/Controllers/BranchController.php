<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBranchRequest;
use App\Http\Requests\UpdateBranchRequest;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Inertia\Response;

class BranchController extends Controller
{
    /**
     * Apply authorization policie //sds to the controller.
     */
    public function __construct()
    {
        $this->authorizeResource(Branch::class, 'branch');
    }

    public function index(): Response
    {
        $this->authorize('viewAny', Branch::class);

        $branches = Branch::withCount([
            'employees',
            'inventoryBatchPortions as near_expiry_portions_count' => function ($query) {
                $query->join('inventory_batches', 'inventory_batch_portions.inventory_batch_id', '=', 'inventory_batches.id')
                      ->where('inventory_batch_portions.status', 'unused')
                      ->whereNotNull('inventory_batches.expiration_date')
                      ->whereDate('inventory_batches.expiration_date', '<=', Carbon::now()->addDays(7));
            }
        ])->orderBy('name')->paginate(10);

        return Inertia::render('Branches/Index', [
            'branches' => $branches,
        ]);
    }

    public function archived(Request $request): Response
    {
        $this->authorize('viewAny', Branch::class);

        $query = Branch::onlyTrashed()->withCount('employees');

        $search = $request->input('search');
        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return Inertia::render('Branches/Archived', [
            'branches' => $query->latest()->paginate(10)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Branch::class);

        return Inertia::render('Branches/Create');
    }

    public function store(StoreBranchRequest $request): RedirectResponse
    {
        $this->authorize('create', Branch::class);

        Branch::create($request->validated());
        return to_route('branches.index')->with('success', 'Branch created successfully.');
    }

    public function edit(Branch $branch): Response
    {
        $this->authorize('update', $branch);

        return Inertia::render('Branches/Edit', [
            'branch' => $branch,
        ]);
    }

    public function update(UpdateBranchRequest $request, Branch $branch): RedirectResponse
    {
        $this->authorize('update', $branch);

        $branch->update($request->validated());
        return to_route('branches.index')->with('success', 'Branch updated successfully.');
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        $this->authorize('delete', $branch);

        // CRITICAL FIX: Only check for ACTIVE employees before archiving.
        if ($branch->employees()->where('is_active', true)->exists()) {
            return to_route('branches.index')->with('error', 'Cannot archive a branch with active employees.');
        }
        $branch->delete();
        return to_route('branches.index')->with('success', 'Branch archived successfully.');
    }

    public function restore(Branch $branch): RedirectResponse
    {
        $this->authorize('restore', $branch);

        $branch->restore();
        return to_route('branches.archived')->with('success', 'Branch restored successfully.');
    }
}
