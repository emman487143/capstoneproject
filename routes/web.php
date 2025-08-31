<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\InventoryAdjustmentController;
use App\Http\Controllers\InventoryBatchController;
use App\Http\Controllers\InventoryCategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InventoryItemController;
use App\Http\Controllers\InventoryLogController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\TransferController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\BranchInventoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryBatchPortionController;
use Illuminate\Http\Request;


Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])->name('dashboard');


Route::middleware('auth')->group(function () {
    // Branch Routes
    Route::get('branches/archived', [BranchController::class, 'archived'])->name('branches.archived');
    Route::post('branches/{branch}/restore', [BranchController::class, 'restore'])->name('branches.restore')->withTrashed();
    Route::resource('branches', BranchController::class);

    // Employee Routes (Reordered to fix routing conflicts)
    Route::get('/employees/archived', [EmployeeController::class, 'archived'])->name('employees.archived');
    Route::post('/employees/{employee}/restore', [EmployeeController::class, 'restore'])->name('employees.restore')->withTrashed();
    Route::patch('/employees/{employee}/deactivate', [EmployeeController::class, 'deactivate'])->name('employees.deactivate');
    Route::resource('employees', EmployeeController::class);

    // Inventory Routes
    Route::prefix('inventory')->name('inventory.')->group(function () {
        Route::get('/', [InventoryController::class, 'index'])->name('index');

        Route::resource('adjustments', InventoryAdjustmentController::class)->only(['create', 'store']);

        Route::resource('categories', InventoryCategoryController::class)->except(['show']);
        // This route is now for global item management (Admins only)
        Route::resource('items', InventoryItemController::class)->except(['show']);
 Route::get('/items/{item}/available-portions', [InventoryItemController::class, 'getAvailablePortionsForTransfer'])->name('items.available-portions');
         Route::get('items/{item}/batches-with-portions', [InventoryItemController::class, 'batchesWithPortions'])->name('items.batches-with-portions');
        Route::get('items/{item}/batches', [InventoryBatchController::class, 'index'])->name('items.batches.index');
        Route::resource('batches', InventoryBatchController::class)->except(['index', 'destroy', 'show']);
        Route::get('batches/{batch}', [InventoryBatchController::class, 'show'])->name('batches.show');
 Route::get('batches/{batch}/available-portions', [InventoryBatchController::class, 'getAvailablePortions'])->name('batches.available-portions');
 Route::post('inventory/batches/{batch}/correct-count', [InventoryBatchController::class, 'correctCount'])
    ->name('batches.correct-count')
    ->middleware(['auth']);
    Route::get('batches/{batch}/portions/restore', [InventoryBatchPortionController::class, 'restoreForm'])
            ->name('batches.portions.restore-form');
        Route::post('batches/{batch}/portions/restore', [InventoryBatchPortionController::class, 'restore'])
            ->name('batches.portions.restore');
        Route::resource('logs', InventoryLogController::class)->only(['index']);
 Route::get('transfers/get-inventory/{branch}', [TransferController::class, 'getInventoryForTransfer'])->name('transfers.get-inventory');
   Route::post('transfers/{transfer}/cancel', [TransferController::class, 'cancel'])->name('transfers.cancel');
   Route::post('/inventory/transfers/{transfer}/reject', [TransferController::class, 'reject'])
    ->name('transfers.reject');
        Route::resource('transfers', TransferController::class)->only(['index', 'create', 'store', 'show', 'update']);
        Route::get('transfers/{transfer}/receive', [TransferController::class, 'receive'])->name('transfers.receive');
    });




Route::resource('products', ProductController::class);
    Route::resource('product-categories', ProductCategoryController::class)->except(['show']);
    // Settings & Profile Routes are in their own files
    Route::post('/sales/check-stock', [SaleController::class, 'checkStock'])->name('sales.check-stock');
    Route::resource('sales', SaleController::class);





});

// These lines correctly load the other route files.
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
