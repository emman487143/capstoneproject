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
    public function index(): Response
    {
        $categories = InventoryCategory::withCount('inventoryItems')
            ->orderBy('name')
            ->paginate(10);

        return Inertia::render('Inventory/Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Inventory/Categories/Create');
    }

    public function store(StoreInventoryCategoryRequest $request): RedirectResponse
    {
        InventoryCategory::create($request->validated());
        return redirect()->route('inventory.categories.index')->with('success', 'Category created.');
    }

    public function edit(InventoryCategory $category): Response
    {
        return Inertia::render('Inventory/Categories/Edit', [
            'category' => $category,
        ]);
    }

    public function update(UpdateInventoryCategoryRequest $request, InventoryCategory $category): RedirectResponse
    {
        $category->update($request->validated());
        return redirect()->route('inventory.categories.index')->with('success', 'Category updated.');
    }

    public function destroy(InventoryCategory $category): RedirectResponse
    {
        if ($category->inventoryItems()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete category. It is already assigned to one or more items.');
        }

        $category->delete();
        return redirect()->route('inventory.categories.index')->with('success', 'Category deleted.');
    }
}
