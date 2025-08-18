import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Edit, ImageOff, LoaderCircle, MoreVertical, PlusCircle, Search, Tag, Trash2 } from 'lucide-react';
import { Building } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BreadcrumbItem, type PaginatedResponse, type Product, type ProductCategory, type SharedData } from '@/types';
import { cn } from '@/lib/utils';

interface IndexProps extends SharedData {
    products: PaginatedResponse<Product>;
    categories: Pick<ProductCategory, 'id' | 'name'>[];
    filters: {
        search?: string;
        category?: string;
    };
}
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Products', href: route('products.index') },
];

export default function Index({ products, categories, filters }: IndexProps) {
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { delete: destroy, processing } = useForm();

    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || '');

    useEffect(() => {
        // Debounce search to avoid excessive requests
        const timeoutId = setTimeout(() => {
            router.get(
                route('products.index'),
                { search, category },
                { preserveState: true, replace: true, preserveScroll: true },
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search]);

    const handleCategoryChange = (value: string) => {
        const newCategory = value === 'all' ? '' : value;
        setCategory(newCategory);
        router.get(
            route('products.index'),
            { search, category: newCategory },
            { preserveState: true, replace: true, preserveScroll: true },
        );
    };

    function handleDelete(e: React.FormEvent) {
        e.preventDefault();
        if (!productToDelete) return;
        destroy(route('products.destroy', productToDelete.id), {
            onFinish: () => setProductToDelete(null),
            preserveScroll: true,
        });
    }

    const selectedCategory = categories.find(c => c.id.toString() === category)?.name;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Products" />

            <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
                <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <span className="font-semibold text-foreground">{productToDelete?.name}</span> from your menu.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <AlertDialogCancel className="mt-0">Keep Product</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={processing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Product
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Heading
                        title="Menu Products"
                        description="Manage your menu items and their recipes"
                    />
                    <Button asChild className="self-start sm:self-auto">
                        <Link href={route('products.create')}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            New Product
                        </Link>
                    </Button>
                </div>

               <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>All Products</CardTitle>
                        <CardDescription>
                            {products.total} products in your menu
                            {selectedCategory && <span> • Filtered by {selectedCategory}</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search products..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-[180px]">
                                <Select value={category} onValueChange={handleCategoryChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardContent>
                        {/* Desktop Table View */}
                        <div className="hidden md:block rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[90px]">Image</TableHead>
                                        <TableHead>Product Details</TableHead>
                                        <TableHead className="w-[100px]">Price</TableHead>
                                        <TableHead className="w-[100px]">Type</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.data.length > 0 ? (
                                        products.data.map((product) => (
                                            <TableRow key={product.id} className="hover:bg-muted/50">
                                                <TableCell className="py-3">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="h-16 w-16 rounded-md object-cover"
                                                            onError={(e) => {
                                                                // Prevent infinite error loop and DOM manipulation errors
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                                                            <ImageOff className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-base">{product.name}</div>
                                                    {product.category && (
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                                            <Tag className="h-3 w-3" />
                                                            <span>{product.category?.name}</span>
                                                        </div>
                                                    )}
                                                    {/* Add to your mobile and desktop view to show branch count */}
                                                    {product.branches && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                            <Building className="h-3 w-3" />
                                                            <span>Available at {product.branches.length} {product.branches.length === 1 ? 'branch' : 'branches'}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">₱{parseFloat(product.price).toLocaleString('en-PH')}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={product.is_addon ? "outline" : "secondary"}>
                                                        {product.is_addon ? 'Add-on' : 'Main Item'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={product.is_active ? 'default' : 'outline'}
                                                           className={cn(product.is_active ? "" : "text-muted-foreground")}>
                                                        {product.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={route('products.edit', product.id)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setProductToDelete(product)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                    <p>No products found</p>
                                                    {search && <p className="text-sm">Try adjusting your search terms</p>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {products.data.length > 0 ? (
                                products.data.map((product) => (
                                    <Card key={product.id} className="overflow-hidden">
                                        <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={product.is_addon ? "outline" : "secondary"} className="whitespace-nowrap">
                                                    {product.is_addon ? 'Add-on' : 'Main Item'}
                                                </Badge>
                                                <Badge variant={product.is_active ? 'default' : 'outline'}
                                                       className={cn(product.is_active ? "" : "text-muted-foreground")}>
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('products.edit', product.id)}>Edit Product</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onSelect={() => setProductToDelete(product)}
                                                    >
                                                        Delete Product
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="p-4 flex gap-4">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="h-20 w-20 rounded-md object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                                                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <h3 className="font-medium text-lg">{product.name}</h3>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Tag className="h-3 w-3" />
                                                    <span>{product.category?.name || 'Uncategorized'}</span>
                                                </div>
                                                <p className="text-lg font-semibold">₱{parseFloat(product.price).toLocaleString('en-PH')}</p>
                                                {/* Add to your mobile and desktop view to show branch count */}
                                                {product.branches && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                        <Building className="h-3 w-3" />
                                                        <span>Available at {product.branches.length} {product.branches.length === 1 ? 'branch' : 'branches'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-12 px-4 border rounded-lg">
                                    <p className="text-muted-foreground font-medium">No products found</p>
                                    {search && <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>}
                                </div>
                            )}
                        </div>
                    </CardContent>
                    {products.data.length > 0 && (
                        <CardFooter className="flex justify-between items-center border-t pt-6">
                            <div className="text-sm text-muted-foreground">
                                Showing {products.from}-{products.to} of {products.total} products
                            </div>
                            {products.last_page > 1 && (
                                <Pagination links={products.links} />
                            )}
                        </CardFooter>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
