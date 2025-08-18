<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProductService
{
    /**
     * Create a new product and its ingredients within a transaction.
     *
     * @param array $validatedData
     * @return Product
     * @throws Throwable
     */
    public function createProduct(array $validatedData): Product
    {
        return DB::transaction(function () use ($validatedData) {
            $imagePath = $this->handleImageUpload($validatedData['image'] ?? null);

            $product = Product::create([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                'price' => $validatedData['price'],
                'product_category_id' => $validatedData['product_category_id'],
                'is_active' => $validatedData['is_active'] ?? true,
                'is_addon' => $validatedData['is_addon'] ?? false,
                'image_path' => $imagePath,
            ]);

            $this->syncIngredients($product, $validatedData['ingredients']);

            // Sync branch availability if provided
            if (isset($validatedData['branches'])) {
                $this->syncBranches($product, $validatedData['branches']);
            }

            return $product;
        });
    }

    /**
     * Update an existing product and its ingredients within a transaction.
     *
     * @param Product $product
     * @param array $validatedData
     * @return Product
     * @throws Throwable
     */
    public function updateProduct(Product $product, array $validatedData): Product
    {
        return DB::transaction(function () use ($product, $validatedData) {
            // Prepare the data for the main update, excluding the image for now.
            $updatePayload = [
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                'price' => $validatedData['price'],
                'product_category_id' => $validatedData['product_category_id'],
                'is_addon' => $validatedData['is_addon'],
                'is_active' => $validatedData['is_active'],
            ];

            // Check if a new image file was actually uploaded.
            if (isset($validatedData['image']) && $validatedData['image'] instanceof UploadedFile) {
                // If a new image exists, delete the old one.
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }
                // Store the new image and add its path to the update payload.
                $updatePayload['image_path'] = $this->handleImageUpload($validatedData['image']);
            }
            // If no new image is uploaded, we do nothing, preserving the existing image_path.

            $product->update($updatePayload);

            $this->syncIngredients($product, $validatedData['ingredients']);

            // Sync branch availability if provided
            if (isset($validatedData['branches'])) {
                $this->syncBranches($product, $validatedData['branches']);
            }

            return $product;
        });
    }

    /**
     * Sync the ingredients for a product.
     *
     * @param Product $product
     * @param array $ingredientsData
     */
    protected function syncIngredients(Product $product, array $ingredientsData): void
    {
        $ingredientsToSync = collect($ingredientsData)->mapWithKeys(function ($ingredient) {
            return [
                $ingredient['inventory_item_id'] => [
                    'quantity_required' => $ingredient['quantity_required']
                ]
            ];
        });

        $product->ingredients()->sync($ingredientsToSync);
    }

    /**
     * Sync the branches for a product.
     *
     * @param Product $product
     * @param array $branchesData
     * @return void
     */
    protected function syncBranches(Product $product, array $branchesData): void
    {
        $syncData = [];
        foreach ($branchesData as $branchData) {
            $syncData[$branchData['branch_id']] = [
                'is_available' => $branchData['is_available'] ?? false
            ];
        }

        // Store the image path before syncing branches
        $imagePath = $product->image_path;

        // Use sync to update pivot table
        $product->branches()->sync($syncData);

        // IMPORTANT: Only reload the branches relationship, not the entire model
        // This prevents the image path from being reloaded with potentially incorrect permissions
        $product->setRelation('branches', $product->branches()->get());

        // If image permissions were affected, restore them
        if ($imagePath && file_exists(storage_path('app/public/' . $imagePath))) {
            chmod(storage_path('app/public/' . $imagePath), 0664);
        }
    }

    /**
     * Handle the product image upload.
     *
     * @param UploadedFile|null $file
     * @return string|null
     */
    private function handleImageUpload(?UploadedFile $file): ?string
    {
        if (!$file) {
            return null;
        }

        // Store the file and return only the relative path, not including 'products/'
        // This ensures consistent path handling across the application
        return $file->store('products', 'public');
    }

    /**
     * Delete a product and its associated image file.
     *
     * @param Product $product
     * @return void
     * @throws Throwable
     */
    public function deleteProduct(Product $product): void
    {
        DB::transaction(function () use ($product) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            // The database foreign key constraint handles deleting related ingredients.
            $product->delete();
        });
    }
}
