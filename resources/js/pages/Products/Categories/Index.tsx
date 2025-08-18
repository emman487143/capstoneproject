import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Edit, LoaderCircle, PlusCircle, Trash2 } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { type BreadcrumbItem, type PaginatedResponse, type SharedData, type ProductCategory, Paginator } from '@/types';

interface IndexProps extends SharedData {
    categories: Paginator<ProductCategory>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Product Categories', href: route('product-categories.index') },
];

export default function Index({ categories }: IndexProps) {
    const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
    const { delete: destroy, processing } = useForm();

    function handleDelete(e: React.FormEvent) {
        e.preventDefault();
        if (!categoryToDelete) return;
        destroy(route('product-categories.destroy', categoryToDelete.id), {
            onSuccess: () => setCategoryToDelete(null),
            preserveScroll: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Product Categories" />

            <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the{' '}
                            <span className="font-semibold text-foreground">{categoryToDelete?.name}</span> category.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={processing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Category
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Product Categories"
                        description="Group your products (e.g., Ramen, Drinks) for better organization."
                    />
                    <Button asChild>
                        <Link href={route('product-categories.create')}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add New Category
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.data.length > 0 ? (
                                    categories.data.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell>{cat.products_count}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={route('product-categories.edit', cat.id)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setCategoryToDelete(cat)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No product categories found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {categories.meta && categories.meta.last_page > 1 && (
                    <div className="mt-6 flex justify-center">
                        <Pagination links={categories.meta.links} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
