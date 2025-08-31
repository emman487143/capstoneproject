<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductCategoryController extends Controller
{
    public function __construct()
    {
        // This is critical for security and will now work correctly.
        $this->authorizeResource(ProductCategory::class, 'product_category');
    }

    public function index(): Response
    {
        return Inertia::render('Products/Categories/Index', [
            'categories' => ProductCategory::withCount('products')->latest()->paginate(10),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Products/Categories/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:product_categories,name',
        ]);

        ProductCategory::create($validated);

        return redirect()->route('product-categories.index')->with('success', 'Category created.');
    }

    public function edit(ProductCategory $productCategory): Response
    {
        return Inertia::render('Products/Categories/Edit', [
            'category' => $productCategory,
        ]);
    }

    public function update(Request $request, ProductCategory $productCategory): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:product_categories,name,' . $productCategory->id,

        ]);

        $productCategory->update($validated);

        return redirect()->route('product-categories.index')->with('success', 'Category updated.');
    }

    public function destroy(ProductCategory $productCategory): RedirectResponse
    {
        if ($productCategory->products()->count() > 0) {
            return back()->with('error', 'Cannot delete a category that has products assigned to it.');
        }

        $productCategory->delete();

        return redirect()->route('product-categories.index')->with('success', 'Category deleted.');
    }
}
