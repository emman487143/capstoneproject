import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage, usePoll } from '@inertiajs/react';
import {
    Clock,
    ImageOff,
    Loader2,
    Menu,
    MinusCircle,
    Package,
    PlusCircle,
    Search,
    ShoppingCart,
    Trash2,
    X,
    ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type BreadcrumbItem, type Product, type ProductCategory, Branch, SharedData } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {useDebounce} from '@/hooks/use-debounce';
import BranchSwitcher from '@/components/branch-switcher';
import ItemCustomizationModal from './Partials/ItemCustomizationModal';

// Type definitions remain the same
interface CreateSaleProps {
    productsByCategory: (ProductCategory & { products: Product[] })[];
    branches: Branch[];
    currentBranch: Branch | null;
    recentProducts?: Product[]; // Recently used products
}

interface CartItemModification {
    type: 'remove';
    inventory_item_id: number;
    name: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface CartItem {
    product_id: number;
    name: string;
    quantity: number;
    price: number;
    category?: string;
    image_url?: string | null;
    modifications?: CartItemModification[][]; // Array of modifications for each instance
}

interface PageProps extends SharedData {
    flash: {
        success?: string;
        error?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Record Sale' }];

export default function CreateSale({ productsByCategory, branches, currentBranch, recentProducts = [] }: CreateSaleProps) {
    // Update the usePage hook with proper typing
    const { auth } = usePage<SharedData>().props;
    const { flash } = usePage<PageProps>().props;

    const [cart, setCart] = useState<CartItem[]>([]);
    const [isConfirming, setIsConfirming] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);
    const [isCheckingStock, setIsCheckingStock] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    // Add state for mobile cart drawer
    const [showMobileCart, setShowMobileCart] = useState(false);
    // Add this state for customization
    const [customizingProduct, setCustomizingProduct] = useState<{
        productId: number;
        productName: string;
        productCategory?: number;
        instanceIndex: number;
    } | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        items: [] as { product_id: number; quantity: number; modifications?: CartItemModification[][] }[],
        notes: '',
        branch_id: currentBranch?.id || undefined,
    });

    const debouncedCart = useDebounce(cart, 300);
    const debouncedSearch = useDebounce(searchQuery, 300);
usePoll(10000, {
  onStart() {
      console.log('checking update')
  },
  onFinish() {
      console.log('finished checking')
  }
})
    // Update form data when cart changes
    useEffect(() => {
        const itemsToSubmit = cart.map(({ product_id, quantity, modifications }) => ({
            product_id,
            quantity,
            modifications
        }));

        setData((prevData) => ({
            ...prevData,
            items: itemsToSubmit,
            branch_id: currentBranch?.id,
        }));
    }, [cart, currentBranch]);

    // Perform real-time stock check
    useEffect(() => {
        if (debouncedCart.length === 0 || !currentBranch) {
            setStockError(null);
            return;
        }
        setIsCheckingStock(true);
        axios
            .post(route('sales.check-stock'), {
                branch_id: currentBranch.id,
                items: debouncedCart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
            })
            .then(() => setStockError(null))
            .catch((error) => {
                if (error.response?.data?.errors?.items) {
                    setStockError(error.response.data.errors.items);
                } else {
                    setStockError('An error occurred while checking stock.');
                }
            })
            .finally(() => setIsCheckingStock(false));
    }, [debouncedCart, currentBranch]);

    // Filter products based on search query and active category
    const filteredCategories = useMemo(() => {
        if (!debouncedSearch && activeCategory === 'all') {
            // Filter out addons from the main category display
            return productsByCategory.map(category => ({
                ...category,
                products: category.products.filter(product => !product.is_addon)
            })).filter(category => category.products.length > 0);
        }

        return productsByCategory.map(category => {
            const filteredProducts = category.products.filter(product => {
                const matchesSearch = !debouncedSearch ||
                    product.name.toLowerCase().includes(debouncedSearch.toLowerCase());

                const matchesCategory = activeCategory === 'all' ||
                    category.id.toString() === activeCategory;

                // Filter out addons from main display
                return matchesSearch && matchesCategory && !product.is_addon;
            });

            return {
                ...category,
                products: filteredProducts
            };
        }).filter(category => category.products.length > 0);
    }, [productsByCategory, debouncedSearch, activeCategory]);

    // Get recently used products
    const topRecentProducts = useMemo(() => {
        return recentProducts.slice(0, 8); // Limit to 8 recent products
    }, [recentProducts]);

    // Get all categories for the tabs
    const allCategories = useMemo(() => {
        return productsByCategory.map(category => ({
            id: category.id.toString(),
            name: category.name
        }));
    }, [productsByCategory]);

    // Methods for cart manipulation
    const addToCart = (product: Product, categoryName?: string) => {
        setCart((currentCart) => {
            const existingItem = currentCart.find((item) => item.product_id === product.id);

            if (existingItem) {
                return currentCart.map((item) => {
                    if (item.product_id === product.id) {
                        // Create a new empty modifications array for the new instance
                        const updatedModifications = item.modifications || Array(item.quantity).fill([]);
                        updatedModifications.push([]);

                        return {
                            ...item,
                            quantity: item.quantity + 1,
                            modifications: updatedModifications
                        };
                    }
                    return item;
                });
            }

            return [...currentCart, {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: parseFloat(product.price),
                category: categoryName,
                image_url: product.image_url,
                modifications: [[]] // Initialize with one empty modifications array
            }];
        });

        // Show mobile cart drawer when adding first item on mobile
        if (window.innerWidth < 1024) {
            // Optional: show a brief toast notification instead of opening cart every time
            toast.success(`Added ${product.name}`, {
                description: "Item added to your cart",
                duration: 2000,
            });
        }
    };

    // Updated updateQuantity function to handle modifications arrays
    const updateQuantity = (productId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            removeFromCart(productId);
            return;
        }

        setCart((currentCart) =>
            currentCart.map((item) => {
                if (item.product_id === productId) {
                    const currentQuantity = item.quantity;
                    const currentModifications = item.modifications || Array(currentQuantity).fill([]);

                    if (newQuantity > currentQuantity) {
                        // Add empty modifications arrays for new instances
                        const additionalModifications = Array(newQuantity - currentQuantity).fill([]);
                        return {
                            ...item,
                            quantity: newQuantity,
                            modifications: [...currentModifications, ...additionalModifications]
                        };
                    } else if (newQuantity < currentQuantity) {
                        // Remove modifications arrays for removed instances
                        return {
                            ...item,
                            quantity: newQuantity,
                            modifications: currentModifications.slice(0, newQuantity)
                        };
                    }
                    return {
                        ...item,
                        quantity: newQuantity
                    };
                }
                return item;
            })
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((currentCart) => currentCart.filter((item) => item.product_id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        reset();
        // Close mobile cart drawer if open
        setShowMobileCart(false);
    };

    // Add these functions for customization
    const handleCustomizeItem = (productId: number, productName: string, instanceIndex: number) => {
        // Find the product to get its category
        const product = productsByCategory
            .flatMap(cat => cat.products)
            .find(p => p.id === productId);

        // Don't allow customization for add-ons
        if (product?.is_addon) {
            return;
        }

        setCustomizingProduct({
            productId,
            productName,
            productCategory: product?.product_category_id ?? undefined,
            instanceIndex
        });
    };

    const saveItemModifications = (instanceIndex: number, modifications: CartItemModification[]) => {
        if (!customizingProduct) return;

        setCart(currentCart =>
            currentCart.map(item => {
                if (item.product_id === customizingProduct.productId) {
                    const updatedModifications = [...(item.modifications || Array(item.quantity).fill([]))];
                    updatedModifications[instanceIndex] = modifications;

                    return {
                        ...item,
                        modifications: updatedModifications
                    };
                }
                return item;
            })
        );
    };

    const handleAddAddon = (addon: Product) => {
        addToCart(addon, "Add-ons");
        toast.success(`Added ${addon.name}`);
        // Optionally close the modal or leave it open for further modifications
        // setCustomizingProduct(null);
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

   useEffect(() => {
        if (flash.success) {
            toast.success('Sale Recorded', {
                description: flash.success,
            });
            // Reset the cart after a successful submission
            setCart([]);
            setShowMobileCart(false);
        }

        if (flash.error) {
            toast.error('Sale Failed', {
                description: flash.error,
            });
        }
    }, [flash]);

    const handleConfirmAndSubmit = () => {
        post(route('sales.store'), {
            preserveScroll: true,
            // Don't reset form data until we get a success response
            onSuccess: () => reset(),
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error('Sale Failed', {
                    description: firstError || 'An unknown error occurred.',
                });
                setIsConfirming(false);
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // This is crucial to prevent traditional form submission

        if (cart.length === 0 || processing || !currentBranch || stockError || isCheckingStock) {
            return;
        }

        setIsConfirming(true);
    };

    const handleBranchChange = (branchId: string) => {
        router.get(route('sales.create'), { branch: branchId }, { preserveState: true, replace: true });
    };

    // Render a product card
    const renderProductCard = (product: Product, categoryName?: string) => (
        <Button
            key={product.id}
            variant="outline"
            className="h-auto flex flex-col items-center p-0 overflow-hidden hover:border-primary/50 rounded-xl shadow-sm transition-all"
            onClick={() => addToCart(product, categoryName)}
            type="button"
        >
            <div className="w-full aspect-square relative bg-muted/40">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <ImageOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="w-full p-3 flex flex-col justify-between space-y-1">
                <span className="font-medium truncate text-sm text-left w-full">{product.name}</span>
                <span className="text-sm text-muted-foreground">
                    ₱{parseFloat(product.price).toFixed(2)}
                </span>
            </div>
        </Button>
    );

    // Render the cart contents (shared between desktop and mobile views)
    const renderCartContent = () => (
        <>
            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                    <ShoppingCart className="h-12 w-12 mb-4" />
                    <p>Your cart is empty</p>
                    <p className="text-sm">Add products to begin creating an order</p>
                </div>
            ) : (
                <ScrollArea className="h-[240px] pr-4">
                    <div className="space-y-3">
                        {cart.map((item) => {
                            // Get all modifications for this product
                            const allModifications = item.modifications || Array(item.quantity).fill([]);
                            const hasAnyModifications = allModifications.some(mods => mods.length > 0);

                            return (
                                <div key={item.product_id} className="flex gap-3 p-3 rounded-xl border bg-muted/40 shadow-sm">
                                    {/* Optional: Show small thumbnail if available */}
                                    {item.image_url && (
                                        <div className="h-12 w-12 rounded-lg bg-muted/80 flex-shrink-0 overflow-hidden">
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium truncate">
                                                    {item.name}
                                                    {/* Add this badge for addon items */}
                                                    {productsByCategory
                                                        .flatMap(cat => cat.products)
                                                        .find(p => p.id === item.product_id)?.is_addon && (
                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                            Add-on
                                                        </Badge>
                                                    )}
                                                </p>
                                                {item.category && (
                                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => removeFromCart(item.product_id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        {/* Quantity controls and price */}
                                        <div className="flex items-center justify-between mt-1 mb-1">
                                            <div className="flex items-center rounded-md border bg-background">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-r-none"
                                                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                >
                                                    <MinusCircle className="h-3.5 w-3.5" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        updateQuantity(item.product_id, parseInt(e.target.value) || 1)
                                                    }
                                                    className="h-8 w-12 text-center border-0 rounded-none"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-l-none"
                                                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                >
                                                    <PlusCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                                                {item.quantity > 1 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        ₱{item.price.toFixed(2)} each
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Individual item instances with modifications */}
                                        {item.quantity > 1 && (hasAnyModifications || true) && (
                                            <div className="mt-2 border-t pt-2 border-dashed">
                                                <p className="text-xs text-muted-foreground mb-1">Item details:</p>
                                                <div className="space-y-1.5">
                                                    {Array.from({ length: item.quantity }).map((_, index) => {
                                                        const instanceModifications = allModifications[index] || [];
                                                        const isAddon = productsByCategory
                                                            .flatMap(cat => cat.products)
                                                            .find(p => p.id === item.product_id)?.is_addon;

                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`flex justify-between items-center text-xs p-1 rounded ${
                                                                    instanceModifications.length > 0 ? 'bg-muted' : ''
                                                                }`}
                                                            >
                                                                <div className="flex items-center">
                                                                    <Badge variant="outline" className="mr-2 text-[10px]">
                                                                        #{index + 1}
                                                                    </Badge>

                                                                    {instanceModifications.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {instanceModifications.map((mod: CartItemModification, i: number) => (
                                                                                <span key={i} className="inline-flex items-center text-[10px] text-destructive">
                                                                                    <MinusCircle className="h-2 w-2 mr-0.5" />
                                                                                    No {mod.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">Standard</span>
                                                                    )}
                                                                </div>

                                                                {!isAddon && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-[10px]"
                                                                        onClick={() => handleCustomizeItem(item.product_id, item.name, index)}
                                                                    >
                                                                        Customize
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Single item customize button */}
                                        {item.quantity === 1 && !productsByCategory
                                            .flatMap(cat => cat.products)
                                            .find(p => p.id === item.product_id)?.is_addon && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs mt-1"
                                                onClick={() => handleCustomizeItem(item.product_id, item.name, 0)}
                                            >
                                                Customize
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            {stockError && (
                <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                    <p className="text-sm font-medium">Insufficient Stock</p>
                    <p className="text-xs mt-1">{stockError}</p>
                </div>
            )}
        </>
    );

    // Render cart footer with notes, totals and submit button
    const renderCartFooter = () => (
        <>
            <div className="mt-4">
                <Textarea
                    placeholder="Add any notes for this sale (optional)..."
                    value={data.notes || ''}
                    onChange={(e) => setData('notes', e.target.value)}
                    disabled={processing}
                    className="resize-none"
                    rows={2}
                />
                <InputError message={errors.notes} className="mt-1" />
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-4">
                <div className="text-sm text-muted-foreground">
                    Subtotal
                </div>
                <div className="text-right">
                    ₱{totalAmount.toFixed(2)}
                </div>
            </div>

            <div className="w-full flex items-center justify-between text-base sm:text-lg font-semibold mt-2">
                <span>Total</span>
                <span>₱{totalAmount.toFixed(2)}</span>
            </div>

            <Button
                type="submit"
                className="w-full rounded-xl px-4 py-2 shadow-sm mt-4"
                disabled={cart.length === 0 || processing || !!stockError || isCheckingStock}
                size="lg"
            >
                {isCheckingStock ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking Stock...
                    </>
                ) : processing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    'Complete Sale'
                )}
            </Button>
        </>
    );

    if (!currentBranch) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Record Sale" />
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground text-lg">Please select a branch to begin recording a sale.</p>
                    {branches.length > 0 && (
                        <div className="flex flex-col gap-2 items-center">
                            <p className="text-sm">Choose a branch:</p>
                            <div className="flex gap-2 flex-wrap justify-center">
                                {branches.map(branch => (
                                    <Button
                                        key={branch.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBranchChange(branch.id.toString())}
                                        className="rounded-xl px-4 py-2 shadow-sm"
                                    >
                                        {branch.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </AppLayout>
        );
    }

    // Extract available addons from productsByCategory
    const availableAddons = useMemo(() => {
        return productsByCategory.flatMap(category => category.products)
            .filter(product => product.is_addon);
    }, [productsByCategory]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Record Sale - ${currentBranch.name}`} />
            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8"
            >
                {/* Menu Section - Left Side */}
                <div className="grid auto-rows-max items-start gap-4 md:gap-6 lg:col-span-2">
                    {/* Search and Category Tabs - Desktop */}
                    <div className="hidden md:block">
                        <Card className="rounded-xl shadow-md overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col md:flex-row gap-3 justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search products..."
                                            className="pl-9 rounded-xl"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {auth.user.is_admin && branches.length > 1 && (
                                        <BranchSwitcher
                                            branches={branches}
                                            currentBranch={currentBranch}
                                            onBranchChange={handleBranchChange}
                                            className="rounded-xl"
                                        />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-1">
                                <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                                    <TabsList className="w-full flex flex-wrap h-auto pb-1 justify-start gap-1">
                                        <TabsTrigger value="all" className="h-8 rounded-xl">All Products</TabsTrigger>
                                        {allCategories.map(category => (
                                            <TabsTrigger key={category.id} value={category.id} className="h-8 rounded-xl">
                                                {category.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex md:hidden items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setShowMobileMenu(true)}
                            className="gap-2 rounded-xl px-4 py-2 shadow-sm"
                        >
                            <Menu className="h-4 w-4" />
                            Menu
                        </Button>
                        <div className="flex items-center gap-2">
                            {totalItems > 0 && (
                                <Badge variant="secondary" className="flex gap-1 items-center px-2.5 py-1 rounded-xl">
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    {totalItems}
                                </Badge>
                            )}
                            {auth.user.is_admin && branches.length > 1 && (
                                <BranchSwitcher
                                    branches={branches}
                                    currentBranch={currentBranch}
                                    onBranchChange={handleBranchChange}
                                    className="rounded-xl"
                                />
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Drawer */}
                    <Drawer open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle>Menu Categories</DrawerTitle>
                            </DrawerHeader>
                            <div className="px-4 py-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search products..."
                                        className="pl-9 rounded-xl"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="px-4 py-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={activeCategory === 'all' ? 'default' : 'outline'}
                                        className="justify-start rounded-xl"
                                        onClick={() => {
                                            setActiveCategory('all');
                                            setShowMobileMenu(false);
                                        }}
                                    >
                                        All Products
                                    </Button>
                                    {allCategories.map(category => (
                                        <Button
                                            key={category.id}
                                            variant={activeCategory === category.id ? 'default' : 'outline'}
                                            className="justify-start rounded-xl"
                                            onClick={() => {
                                                setActiveCategory(category.id);
                                                setShowMobileMenu(false);
                                            }}
                                        >
                                            {category.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline" className="rounded-xl px-4 py-2 shadow-sm">Close Menu</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>

                    {/* Recently Used Products */}
                    {topRecentProducts.length > 0 && activeCategory === 'all' && !debouncedSearch && (
                        <Card className="rounded-xl shadow-md overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Recently Used
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {topRecentProducts.map(product => renderProductCard(product))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Products Display */}
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                            category.products.length > 0 && (
                                <Card key={category.id} className="rounded-xl shadow-md overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle>{category.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {category.products.map(product => renderProductCard(product, category.name))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        ))
                    ) : (
                        <Card className="rounded-xl shadow-md overflow-hidden">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                                <Search className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-lg text-muted-foreground">No products found</p>
                                <p className="text-sm text-muted-foreground">
                                    Try adjusting your search or category filter
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* After the main products display */}
                    {availableAddons.length > 0 && (
                        <Card key="addons" className="rounded-xl shadow-md overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <PlusCircle className="h-4 w-4" />
                                    Add-ons
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {availableAddons.map(product => renderProductCard(product, "Add-ons"))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* If no main products but addons exist */}
                    {filteredCategories.length === 0 && availableAddons.length === 0 && (
                        <Card className="rounded-xl shadow-md overflow-hidden">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                                <Search className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-lg text-muted-foreground">No products found</p>
                                <p className="text-sm text-muted-foreground">
                                    Try adjusting your search or category filter
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Order Summary - Right Side (Desktop/Tablet) */}
                <div className="hidden lg:block lg:sticky lg:top-20 h-fit max-h-[calc(100vh-5rem)] overflow-auto z-10">
                    <Card className="border-primary/20 rounded-xl shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div>
                                <CardTitle>Current Order</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Branch: {currentBranch.name} • {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                                </p>
                            </div>
                            {cart.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={clearCart}
                                    className="rounded-xl px-3 py-1.5 shadow-sm"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {renderCartContent()}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 p-4 sm:p-6 border-t">
                            {renderCartFooter()}
                        </CardFooter>
                    </Card>
                </div>
            </form>

            {/* Mobile Floating Cart Button */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-4 right-4 z-50">
                    <Button
                        onClick={() => setShowMobileCart(true)}
                        className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
                        size="icon"
                    >
                        <ShoppingCart className="h-6 w-6" />
                        <Badge className="absolute -top-2 -right-2 px-2 py-1 bg-destructive text-white rounded-full text-xs">
                            {totalItems}
                        </Badge>
                    </Button>
                </div>
            )}

            {/* Mobile Cart Drawer */}
            <Drawer open={showMobileCart} onOpenChange={setShowMobileCart} direction="bottom">
                <DrawerContent className="max-h-[85vh] rounded-t-xl">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-3"></div>
                    <DrawerHeader className="flex items-center justify-between">
                        <div>
                            <DrawerTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                Current Order ({totalItems})
                            </DrawerTitle>
                        </div>
                        {cart.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearCart}
                                className="rounded-xl px-3 py-1.5 shadow-sm"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        )}
                    </DrawerHeader>
                    <div className="p-4 pb-8">
                        {renderCartContent()}

                        <form onSubmit={handleSubmit} className="pt-6">
                            {renderCartFooter()}
                        </form>
                    </div>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Sale for {currentBranch.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to record a sale with {cart.length} product{cart.length !== 1 ? 's' : ''} ({totalItems} item{totalItems !== 1 ? 's' : ''})
                            for a total of <strong className="text-foreground">₱{totalAmount.toFixed(2)}</strong>.
                            <br /><br />
                            This action will deduct from inventory and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 pt-2">
                        <AlertDialogAction
                            onClick={handleConfirmAndSubmit}
                            disabled={processing}
                            className="w-full sm:w-auto rounded-xl px-4 py-2 shadow-sm gap-2"
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Sale
                        </AlertDialogAction>
                        <AlertDialogCancel
                            disabled={processing}
                            className="w-full sm:w-auto rounded-xl px-4 py-2 shadow-sm"
                        >
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Item Customization Modal */}
            {customizingProduct && (
                <ItemCustomizationModal
                    productId={customizingProduct.productId}
                    productName={customizingProduct.productName}
                    productCategory={customizingProduct.productCategory}
                    instanceIndex={customizingProduct.instanceIndex}
                    totalInstances={cart.find(item => item.product_id === customizingProduct.productId)?.quantity || 1}
                    modifications={cart.find(item => item.product_id === customizingProduct.productId)?.modifications?.[customizingProduct.instanceIndex] || []}
                    isOpen={!!customizingProduct}
                    relatedAddons={availableAddons.filter(addon => {
                        // Filter addons that match the current product's category
                        return addon.product_category_id === customizingProduct.productCategory;
                    })}
                    onClose={() => setCustomizingProduct(null)}
                    onSave={saveItemModifications}
                    onAddAddon={handleAddAddon}
                />
            )}
        </AppLayout>
    );
}
