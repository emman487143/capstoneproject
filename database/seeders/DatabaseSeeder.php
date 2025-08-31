<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\InventoryCategory;
use App\Models\ProductCategory;
use App\Models\User;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductIngredient;
use Illuminate\Database\Seeder;
use App\Models\BranchInventoryItem;
use Illuminate\Support\Facades\DB;
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // -------------------------
        // USERS & EMPLOYEES
        // -------------------------
        User::factory()->create([
            'name' => 'Owner Account',
            'email' => 'owner@gmail.com',
            'password' => bcrypt('admin1234'),
            'role' => 'owner',
            'is_admin' => true,
        ]);

        $branch1 = Branch::factory()->create([
            'name' => 'Cabanatuan Branch',
            'address' => '118 General Tinio Street Extension, Cabanatuan City, Nueva Ecija',
            'phone_number' => '09568855475',
            'code' => 'CB',
        ]);

        $branch2 = Branch::factory()->create([
            'name' => 'Talavera Branch',
            'address' => 'Dinarayat, Talavera, Nueva Ecija',
            'phone_number' => '09268235475',
            'code' => 'TB',
        ]);

        User::factory()->create([
            'name' => 'Hanna Javaluyas',
            'email' => 'hannajavaluyas@gmail.com',
            'password' => bcrypt('123123123'),
            'role' => 'staff',
            'is_admin' => false,
        ]);

        Employee::factory()->create([
            'first_name' => 'Hanna',
            'last_name' => 'Javaluyas',
            'job_title' => 'Cashier',
            'contact_number' => '09123456789',
            'branch_id' => 1,
            'is_active' => true,
            'user_id' => 2,
        ]);

        User::factory()->create([
            'name' => 'Emman Sales',
            'email' => 'emmansales@gmail.com',
            'password' => bcrypt('123123123'),
            'role' => 'staff',
            'is_admin' => false,
        ]);

        Employee::factory()->create([
            'first_name' => 'Emman',
            'last_name' => 'Sales',
            'job_title' => 'Cook',
            'contact_number' => '09123456789',
            'branch_id' => 1,
            'is_active' => true,
            'user_id' => 3,
        ]);

        Employee::factory()->create([
            'first_name' => 'Japa',
            'last_name' => 'Aice',
            'job_title' => 'Waiter',
            'contact_number' => '09123456789',
            'branch_id' => 1,
            'is_active' => true,
            'user_id' => null,
        ]);

        User::factory()->create([
            'name' => 'Bea Bustamante',
            'email' => 'beabustamante@gmail.com',
            'password' => bcrypt('123123123'),
            'role' => 'staff',
            'is_admin' => false,
        ]);

        Employee::factory()->create([
            'first_name' => 'Bea',
            'last_name' => 'Bustamante',
            'job_title' => 'Cashier',
            'contact_number' => '09123456789',
            'branch_id' => 2,
            'is_active' => true,
            'user_id' => 4,
        ]);

        User::factory()->create([
            'name' => 'Abi Sebastian',
            'email' => 'abisebastian@gmail.com',
            'password' => bcrypt('123123123'),
            'role' => 'staff',
            'is_admin' => false,
        ]);

        Employee::factory()->create([
            'first_name' => 'Abi',
            'last_name' => 'Sebastian',
            'job_title' => 'Cook',
            'contact_number' => '09123456789',
            'branch_id' => 2,
            'is_active' => true,
            'user_id' => 5,
        ]);

        Employee::factory()->create([
            'first_name' => 'Rogel',
            'last_name' => 'Colino',
            'job_title' => 'Waiter',
            'contact_number' => '09123456789',
            'branch_id' => 2,
            'is_active' => true,
            'user_id' => null,
        ]);

        // -------------------------
        // INVENTORY CATEGORIES
        // -------------------------
        $inventoryCategories = [
            'Noodles',
            'Broth Base',
            'Meat',
            'Vegetables',
            'Toppings',
            'Seasonings',
            'Oils & Sauces',
            'Beverages',
            'Side Dish Ingredients',
        ];

        foreach ($inventoryCategories as $cat) {
            InventoryCategory::firstOrCreate(['name' => $cat]);
        }

        // -------------------------
        // INVENTORY ITEMS
        // -------------------------
       $items = [
    // Noodles & Broth
    ['name' => 'Ramen Noodles', 'code' => 'NDL', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Noodles'],
    ['name' => 'Sushi Rice', 'code' => 'SRIC', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Side Dish Ingredients'],
    ['name' => 'Tonkotsu Broth', 'code' => 'TBRO', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Broth Base'],
    ['name' => 'Milky Broth', 'code' => 'MBRO', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Broth Base'],
    ['name' => 'Curry Broth Base', 'code' => 'CBRO', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Broth Base'],
    // Meat & Seafood
    ['name' => 'Pork Chashu', 'code' => 'PCHU', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Meat'],
    ['name' => 'Shrimp', 'code' => 'SHMP', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Meat'],
    ['name' => 'Tempura Shrimp', 'code' => 'TMPS', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Side Dish Ingredients'],
    ['name' => 'Chicken Cutlet', 'code' => 'CCLT', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Meat'],
    ['name' => 'Pork Cutlet', 'code' => 'PCLT', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Meat'],
    // Vegetables
    ['name' => 'Cabbage', 'code' => 'CABB', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Vegetables'],
    ['name' => 'Carrot', 'code' => 'CARR', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Vegetables'],
    ['name' => 'Lettuce', 'code' => 'LETT', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Vegetables'],
    ['name' => 'Cucumber', 'code' => 'CUCU', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Vegetables'],
    ['name' => 'Avocado', 'code' => 'AVOC', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Vegetables'],
    // Toppings & Fillings
    ['name' => 'Boiled Egg', 'code' => 'EGGB', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Toppings'],
    ['name' => 'Nori Sheet', 'code' => 'NORI', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Toppings'],
    ['name' => 'Cheese', 'code' => 'CHSE', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Toppings'],
    ['name' => 'Crab Stick', 'code' => 'CRAB', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Side Dish Ingredients'],
    // Seasonings & Sauces
    ['name' => 'Soy Sauce', 'code' => 'SOYS', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Oils & Sauces'],
    ['name' => 'Sesame Oil', 'code' => 'SESO', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Oils & Sauces'],
    ['name' => 'Chili Paste', 'code' => 'CHLP', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Seasonings'],
    ['name' => 'Spicy Mayo', 'code' => 'SMAY', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Seasonings'],
    // Beverages
    ['name' => 'Mineral Water Bottle', 'code' => 'MWAT', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Beverages'],
    ['name' => 'Iced Tea', 'code' => 'ICTA', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Beverages'],
    ['name' => 'Coke Can', 'code' => 'COKE', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Beverages'],
    ['name' => 'Pineapple Juice', 'code' => 'PJUI', 'unit' => 'ml', 'tracking_type' => 'by_measure', 'category' => 'Beverages'],
    ['name' => 'Coffee Beans', 'code' => 'COFB', 'unit' => 'g', 'tracking_type' => 'by_measure', 'category' => 'Beverages'],
    ['name' => 'San Mig Light', 'code' => 'SMLT', 'unit' => 'bottle', 'tracking_type' => 'by_portion', 'category' => 'Beverages'],
    ['name' => 'Asahi Beer', 'code' => 'ASAH', 'unit' => 'bottle', 'tracking_type' => 'by_portion', 'category' => 'Beverages'],
    // Sides & Others
    ['name' => 'Gyoza Dumpling', 'code' => 'GYOZ', 'unit' => 'piece', 'tracking_type' => 'by_portion', 'category' => 'Side Dish Ingredients'],
    [
    'name' => 'Fried Rice',
    'code' => 'FRIC',
    'unit' => 'g',
    'tracking_type' => 'by_measure',
    'category' => 'Side Dish Ingredients'
],
];

        $itemIds = [];
foreach ($items as $item) {
    $category = InventoryCategory::where('name', $item['category'])->first();
    $inv = InventoryItem::firstOrCreate([
        'name' => $item['name'],
        'code' => $item['code'], // <-- ADD THIS LINE
        'unit' => $item['unit'],
        'tracking_type' => $item['tracking_type'],
        'inventory_category_id' => $category->id,
    ]);
    $itemIds[$item['name']] = $inv->id;
}
        // -------------------------
        // PRODUCT CATEGORIES
        // -------------------------
        $productCategories = [
            'Ramen',
            'Bento Meals',
            'Solo Order',
            'Maki Rolls',
            'Side Dishes',
            'Drinks',
        ];

        foreach ($productCategories as $cat) {
            ProductCategory::firstOrCreate(['name' => $cat]);
        }

        // -------------------------
        // PRODUCTS
        // -------------------------
        $products = [
            ['name' => 'Original Ramen', 'price' => 220, 'category' => 'Ramen', 'image_path' => 'products/Original_Ramen.png'],
            ['name' => 'Scarlet Spicy Ramen', 'price' => 250, 'category' => 'Ramen', 'image_path' => 'products/Scarlet_Spicy_Ramen.png'],
            ['name' => 'Shrimp Ramen', 'price' => 280, 'category' => 'Ramen', 'image_path' => 'products/Shrimp_Ramen.png'],
            ['name' => 'Milky Ramen', 'price' => 240, 'category' => 'Ramen', 'image_path' => 'products/Milky_Ramen.png'],
            ['name' => 'Cheesy Curry Ramen', 'price' => 270, 'category' => 'Ramen', 'image_path' => 'products/Cheesy_Curry_Ramen.png'],
            ['name' => 'Bento A', 'price' => 200, 'category' => 'Bento Meals', 'image_path' => 'products/Bento_A.png'],
            ['name' => 'Bento B', 'price' => 230, 'category' => 'Bento Meals', 'image_path' => 'products/Bento_B.png'],
            ['name' => 'Pork Katsu', 'price' => 180, 'category' => 'Solo Order', 'image_path' => 'products/Pork_Katsu.png'],
            ['name' => 'Chicken Katsu', 'price' => 170, 'category' => 'Solo Order', 'image_path' => 'products/Chicken_Katsu.png'],
            ['name' => 'California Maki', 'price' => 150, 'category' => 'Maki Rolls', 'image_path' => 'products/California_Maki.png'],
            ['name' => 'Cheesy Ebi Roll', 'price' => 160, 'category' => 'Maki Rolls', 'image_path' => 'products/Cheesy_Ebi_Roll.png'],
            ['name' => 'Tempura Roll', 'price' => 160, 'category' => 'Maki Rolls', 'image_path' => 'products/Tempura_Roll.png'],
            ['name' => 'Spicy Crab Roll', 'price' => 160, 'category' => 'Maki Rolls', 'image_path' => 'products/Spicy_Crab_Roll.png'],
            ['name' => 'Crunchy Crab Roll', 'price' => 170, 'category' => 'Maki Rolls', 'image_path' => 'products/Crunchy_Crab_Roll.png'],
            ['name' => 'Ebi Tempura', 'price' => 140, 'category' => 'Side Dishes', 'image_path' => 'products/Ebi_Tempura.png'],
            ['name' => 'Kani Salad', 'price' => 130, 'category' => 'Side Dishes', 'image_path' => 'products/Kani_Salad.png'],
            ['name' => 'Gyoza', 'price' => 120, 'category' => 'Side Dishes', 'image_path' => 'products/Gyoza.png'],
            ['name' => 'Chicken Karaage', 'price' => 150, 'category' => 'Side Dishes', 'image_path' => 'products/Chicken_Karaage.png'],
            ['name' => 'Mineral Water', 'price' => 30, 'category' => 'Drinks', 'image_path' => 'products/Mineral_Water.png'],
            ['name' => 'Iced Tea', 'price' => 40, 'category' => 'Drinks', 'image_path' => 'products/Iced_Tea.png'],
            ['name' => 'Coke', 'price' => 45, 'category' => 'Drinks', 'image_path' => 'products/Coke.png'],
            ['name' => 'Pineapple Juice', 'price' => 50, 'category' => 'Drinks', 'image_path' => 'products/Pineapple_Juice.png'],
            ['name' => 'Iced Coffee', 'price' => 60, 'category' => 'Drinks', 'image_path' => 'products/Iced_Coffee.png'],
            ['name' => 'Hot Coffee', 'price' => 60, 'category' => 'Drinks', 'image_path' => 'products/Hot_Coffee.png'],
            ['name' => 'San Mig Light', 'price' => 70, 'category' => 'Drinks', 'image_path' => 'products/San_Mig_Light.png'],
            ['name' => 'Asahi/Ichiban/Kirin', 'price' => 90, 'category' => 'Drinks', 'image_path' => 'products/Asahi_Ichiban_Kirin.png'],
        ];

        $productIds = [];
        foreach ($products as $prod) {
    $cat = ProductCategory::where('name', $prod['category'])->first();
    $p = Product::firstOrCreate([
        'name' => $prod['name'],
        'price' => $prod['price'],
        'product_category_id' => $cat->id,
    ], [
        'image_path' => $prod['image_path'] ?? null, // <-- set image_path if present
        'is_active' => true,
        'is_addon' => false,
    ]);
    $productIds[$prod['name']] = $p->id;
}

        // -------------------------
        // PRODUCT INGREDIENTS (recipes)
        // -------------------------
      $recipes = [
    // Ramen
    'Original Ramen' => ['Ramen Noodles' => 120, 'Tonkotsu Broth' => 400, 'Pork Chashu' => 50, 'Boiled Egg' => 1, 'Nori Sheet' => 1],
    'Scarlet Spicy Ramen' => ['Ramen Noodles' => 120, 'Tonkotsu Broth' => 400, 'Chili Paste' => 10, 'Pork Chashu' => 50, 'Boiled Egg' => 1, 'Nori Sheet' => 1],
    'Shrimp Ramen' => ['Ramen Noodles' => 120, 'Tonkotsu Broth' => 400, 'Shrimp' => 3, 'Boiled Egg' => 1],
    'Milky Ramen' => ['Ramen Noodles' => 120, 'Milky Broth' => 400, 'Pork Chashu' => 50, 'Boiled Egg' => 1],
    'Cheesy Curry Ramen' => ['Ramen Noodles' => 120, 'Curry Broth Base' => 400, 'Cheese' => 20, 'Pork Chashu' => 50, 'Boiled Egg' => 1],
    // Bento & Solo
    'Pork Katsu' => ['Pork Cutlet' => 1],
    'Chicken Katsu' => ['Chicken Cutlet' => 1],
    // Bento Meals
    'Bento A' => [
        'Fried Rice' => 150,
        'Pork Cutlet' => 1,
        'Gyoza Dumpling' => 2,
        'Crab Stick' => 1,
        'Lettuce' => 20,
        'Carrot' => 10,
        'Cucumber' => 5,
    ],
    'Bento B' => [
        'Fried Rice' => 150,
        'Chicken Cutlet' => 1,
        'Gyoza Dumpling' => 2,
        'Crab Stick' => 1,
        'Lettuce' => 20,
        'Carrot' => 10,
        'Cucumber' => 5,
    ],
    // Maki Rolls (corrected)
    'California Maki' => ['Sushi Rice' => 100, 'Nori Sheet' => 1, 'Crab Stick' => 3, 'Cucumber' => 20, 'Avocado' => 20],
    'Cheesy Ebi Roll' => ['Sushi Rice' => 100, 'Nori Sheet' => 1, 'Shrimp' => 2, 'Cheese' => 10, 'Cucumber' => 10],
    'Tempura Roll' => ['Sushi Rice' => 100, 'Nori Sheet' => 1, 'Tempura Shrimp' => 2, 'Cucumber' => 10],
    'Spicy Crab Roll' => ['Sushi Rice' => 100, 'Nori Sheet' => 1, 'Crab Stick' => 3, 'Spicy Mayo' => 10, 'Cucumber' => 10],
    'Crunchy Crab Roll' => ['Sushi Rice' => 100, 'Nori Sheet' => 1, 'Crab Stick' => 3, 'Cheese' => 10, 'Cucumber' => 10],
    // Sides
    'Ebi Tempura' => ['Tempura Shrimp' => 3],
    'Kani Salad' => ['Crab Stick' => 2, 'Lettuce' => 50, 'Carrot' => 20, 'Cucumber' => 10],
    'Gyoza' => ['Gyoza Dumpling' => 4],
    'Chicken Karaage' => ['Chicken Cutlet' => 1],
    // Drinks
    'Mineral Water' => ['Mineral Water Bottle' => 1],
    'Iced Tea' => ['Iced Tea' => 250],
    'Coke' => ['Coke Can' => 1],
    'Pineapple Juice' => ['Pineapple Juice' => 250],
    'Iced Coffee' => ['Coffee Beans' => 10],
    'Hot Coffee' => ['Coffee Beans' => 10],
    'San Mig Light' => ['San Mig Light' => 1],
    'Asahi/Ichiban/Kirin' => ['Asahi Beer' => 1],
];

        foreach ($recipes as $productName => $ingredients) {
            if (!isset($productIds[$productName])) continue;
            foreach ($ingredients as $itemName => $qty) {
                if (!isset($itemIds[$itemName])) continue;
                ProductIngredient::firstOrCreate([
                    'product_id' => $productIds[$productName],
                    'inventory_item_id' => $itemIds[$itemName],
                    'quantity_required' => $qty,
                ]);
            }
        }

            $branches = [$branch1, $branch2];
foreach ($branches as $branch) {
    foreach ($itemIds as $itemName => $itemId) {
        DB::table('branch_inventory_item')->updateOrInsert(
            [
                'branch_id' => $branch->id,
                'inventory_item_id' => $itemId,
            ],
            [
                'low_stock_threshold' => 10, // or your default
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}

foreach ([$branch1, $branch2] as $branch) {
    foreach ($productIds as $productName => $productId) {
        DB::table('branch_product')->updateOrInsert(
            [
                'branch_id' => $branch->id,
                'product_id' => $productId,
            ],
            [
                'is_available' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}


$addonProducts = [
    ['name' => 'Extra Noodles', 'price' => 40, 'category' => 'Ramen', 'image_path' => 'products/Extra_Noodles.png', 'is_addon' => true],
    ['name' => 'Extra Egg', 'price' => 25, 'category' => 'Ramen', 'image_path' => 'products/Extra_Egg.png', 'is_addon' => true],
    ['name' => 'Extra Nori', 'price' => 20, 'category' => 'Ramen', 'image_path' => 'products/Extra_Nori.png', 'is_addon' => true],
];

foreach ($addonProducts as $addon) {
    $cat = ProductCategory::where('name', $addon['category'])->first();
    $p = Product::firstOrCreate([
        'name' => $addon['name'],
        'price' => $addon['price'],
        'product_category_id' => $cat->id,
    ], [
        'image_path' => $addon['image_path'],
        'is_active' => true,
        'is_addon' => true,
    ]);
    $productIds[$addon['name']] = $p->id;
}

// 2. Add Addon Recipes (link to correct inventory items)
$addonRecipes = [
    'Extra Noodles' => ['Ramen Noodles' => 120],
    'Extra Egg' => ['Boiled Egg' => 1],
    'Extra Nori' => ['Nori Sheet' => 1],
];

foreach ($addonRecipes as $productName => $ingredients) {
    if (!isset($productIds[$productName])) continue;
    foreach ($ingredients as $itemName => $qty) {
        if (!isset($itemIds[$itemName])) continue;
        ProductIngredient::firstOrCreate([
            'product_id' => $productIds[$productName],
            'inventory_item_id' => $itemIds[$itemName],
            'quantity_required' => $qty,
        ]);
    }
}

// 3. Make Addons available for both branches
foreach ([$branch1, $branch2] as $branch) {
    foreach (['Extra Noodles', 'Extra Egg', 'Extra Nori'] as $addonName) {
        if (!isset($productIds[$addonName])) continue;
        DB::table('branch_product')->updateOrInsert(
            [
                'branch_id' => $branch->id,
                'product_id' => $productIds[$addonName],
            ],
            [
                'is_available' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}

    }
}
