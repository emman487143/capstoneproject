<?php

namespace App\Http\Controllers;

use App\Models\InventoryCategory;
use App\Http\Requests\StoreInventoryCategoryRequest;
use App\Http\Requests\UpdateInventoryCategoryRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InventoryCategoryController extends Controller
{
    /**
     * Apply authorization policies to the controller.
     */
    public function __construct()
    {
        $this->authorizeResource(InventoryCategory::class, 'category');
    }

    public function index(): Response
    {
        $this->authorize('viewAny', InventoryCategory::class);

        $categories = InventoryCategory::withCount('inventoryItems')
            ->orderBy('name')
            ->paginate(10);

        return Inertia::render('Inventory/Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', InventoryCategory::class);

        return Inertia::render('Inventory/Categories/Create');
    }

    public function store(StoreInventoryCategoryRequest $request): RedirectResponse
    {
        $this->authorize('create', InventoryCategory::class);

        InventoryCategory::create($request->validated());
        return redirect()->route('inventory.categories.index')->with('success', 'Category created.');
    }

    public function edit(InventoryCategory $category): Response
    {
        $this->authorize('update', $category);

        return Inertia::render('Inventory/Categories/Edit', [
            'category' => $category,
        ]);
    }

    public function update(UpdateInventoryCategoryRequest $request, InventoryCategory $category): RedirectResponse
    {
        $this->authorize('update', $category);

        $category->update($request->validated());
        return redirect()->route('inventory.categories.index')->with('success', 'Category updated.');
    }

    public function destroy(InventoryCategory $category): RedirectResponse
    {
        $this->authorize('delete', $category);

        if ($category->inventoryItems()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete category. It is already assigned to one or more items.');
        }

        $category->delete();
        return redirect()->route('inventory.categories.index')->with('success', 'Category deleted.');
    }
}
