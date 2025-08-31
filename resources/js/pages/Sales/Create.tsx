import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
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
    X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type BreadcrumbItem, type Product, type ProductCategory } from '@/types';
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
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { type Branch, type SharedData } from '@/types';
import BranchSwitcher from '@/components/branch-switcher';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface CreateSaleProps {
    productsByCategory: (ProductCategory & { products: Product[] })[];
    branches: Branch[];
    currentBranch: Branch | null;
    recentProducts?: Product[]; // Recently used products
}

interface CartItem {
    product_id: number;
    name: string;
    quantity: number;
    price: number;
    category?: string;
    image_url?: string | null;
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

    const { data, setData, post, processing, errors, reset } = useForm({
        items: [] as { product_id: number; quantity: number }[],
        notes: '',
        branch_id: currentBranch?.id || undefined,
    });

    const debouncedCart = useDebounce(cart, 300);
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Update form data when cart changes
    useEffect(() => {
        const itemsToSubmit = cart.map(({ product_id, quantity }) => ({ product_id, quantity }));
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
                return currentCart.map((item) =>
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
                );
            }
            return [...currentCart, {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: parseFloat(product.price),
                category: categoryName,
                image_url: product.image_url
            }];
        });
    };

    const updateQuantity = (productId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCart((currentCart) =>
            currentCart.map((item) => (item.product_id === productId ? { ...item, quantity: newQuantity } : item)),
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((currentCart) => currentCart.filter((item) => item.product_id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        reset();
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
            className="h-auto flex flex-col items-center p-0 overflow-hidden hover:border-primary/50"
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
                                        onClick={() => handleBranchChange(branch.id.toString())}
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
                className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-6 lg:grid-cols-3 xl:grid-cols-3"
            >
                {/* Menu Section - Left Side */}
                <div className="grid auto-rows-max items-start gap-4 md:gap-6 lg:col-span-2">
                    {/* Search and Category Tabs - Desktop */}
                    <div className="hidden md:block">
                        <Card>

                            <CardHeader className="pb-3">
                                <div className="flex flex-col md:flex-row gap-3 justify-between">
                                    <div className="relative flex-grow max-w-md">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search products..."
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {auth.user.is_admin && branches.length > 1 && (
                                        <BranchSwitcher
                                            branches={branches}
                                            currentBranch={currentBranch}
                                            onBranchChange={handleBranchChange}
                                        />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-1">
                                <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                                    <TabsList className="w-full h-auto flex flex-nowrap overflow-x-auto pb-1">
                                        <TabsTrigger value="all" className="whitespace-nowrap">All Products</TabsTrigger>
                                        {allCategories.map(cat => (
                                            <TabsTrigger key={cat.id} value={cat.id} className="whitespace-nowrap">{cat.name}</TabsTrigger>
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
                            className="gap-2"
                        >
                            <Menu className="h-4 w-4" />
                            Menu
                        </Button>
                        <div className="flex items-center gap-2">
                            {totalItems > 0 && (
                                <Badge variant="secondary" className="flex gap-1 items-center">
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    {totalItems}
                                </Badge>
                            )}
                            {auth.user.is_admin && branches.length > 1 && (
                                <BranchSwitcher
                                    branches={branches}
                                    currentBranch={currentBranch}
                                    onBranchChange={handleBranchChange}
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
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="px-4 py-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={activeCategory === 'all' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setActiveCategory('all');
                                            setShowMobileMenu(false);
                                        }}
                                        className="justify-start"
                                    >
                                        All Products
                                    </Button>
                                    {allCategories.map(cat => (
                                        <Button
                                            key={cat.id}
                                            variant={activeCategory === cat.id ? 'default' : 'outline'}
                                            onClick={() => {
                                                setActiveCategory(cat.id);
                                                setShowMobileMenu(false);
                                            }}
                                            className="justify-start"
                                        >
                                            {cat.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline">Close</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>



                    {/* Products Display */}
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                            category.products.length > 0 && (
                                <Card key={category.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle>{category.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {category.products.map((product) => renderProductCard(product, category.name))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        ))
                    ) : (
                        <Card>
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
    <Card key="addons">
        <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
                <span>Add-ons</span>
                <Badge variant="outline" className="font-normal">
                    Optional items
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableAddons.map((product) => renderProductCard(product, "Add-on"))}
            </div>
        </CardContent>
    </Card>
)}

{/* If no main products but addons exist */}
{filteredCategories.length === 0 && availableAddons.length === 0 && (
    <Card>
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

                {/* Order Summary - Right Side */}
                <div className="lg:sticky lg:top-20 space-y-4">
                    <Card className="border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div>
                                <CardTitle>Current Order</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Branch: {currentBranch.name} • {cart.length > 0 ? `${totalItems} item${totalItems !== 1 ? 's' : ''}` : 'Empty'}
                                </p>
                            </div>
                            {cart.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={clearCart}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                                    <ShoppingCart className="h-12 w-12 mb-4" />
                                    <p>Your order is empty</p>
                                    <p className="text-sm">Select products to add them to your order</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[240px] pr-4">
                                    <div className="space-y-3">
                                        {cart.map((item) => (
                                            <div key={item.product_id} className="flex gap-3 p-2 rounded-md border bg-muted/40">
                                                {/* Optional: Show small thumbnail if available */}
                                                {item.image_url && (
                                                    <div className="h-12 w-12 rounded bg-muted/80 flex-shrink-0 overflow-hidden">
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
                                                    <div className="flex items-center justify-between mt-1">
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
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            {stockError && (
                                <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
                                    <p className="text-sm font-medium">Insufficient Stock</p>
                                    <p className="text-xs mt-1">{stockError}</p>
                                </div>
                            )}

                            <div className="mt-4">
                                <Textarea
                                    placeholder="Add any notes for this sale (optional)..."
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    disabled={processing}
                                    className="resize-none"
                                    rows={2}
                                />
                                <InputError message={errors.notes} className="mt-1" />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <div className="w-full grid grid-cols-2 gap-2">
                                <div className="text-sm text-muted-foreground">
                                    Subtotal
                                </div>
                                <div className="text-right">
                                    ₱{totalAmount.toFixed(2)}
                                </div>
                            </div>

                            <div className="w-full flex items-center justify-between text-lg font-semibold">
                                <span>Total</span>
                                <span>₱{totalAmount.toFixed(2)}</span>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={cart.length === 0 || processing || !!stockError || isCheckingStock}
                                size="lg"
                            >
                                {isCheckingStock ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Checking Stock...
                                    </>
                                ) : processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Recording...
                                    </>
                                ) : (
                                    'Complete Sale'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Sale for {currentBranch.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to record a sale with {cart.length} product{cart.length !== 1 ? 's' : ''} ({totalItems} item{totalItems !== 1 ? 's' : ''})
                            for a total of <strong className="text-foreground">₱{totalAmount.toFixed(2)}</strong>.
                            <br /><br />
                            This action will deduct from inventory and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAndSubmit}
                            disabled={processing}
                            className="gap-2"
                        >
                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Sale
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
