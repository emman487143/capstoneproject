import { useEffect, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { BreadcrumbItem, PaginatedResponse, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Pagination from '@/components/pagination';
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

interface Category {
    id: number;
    name: string;
    inventory_items_count: number;
}

interface IndexProps extends SharedData {
    categories: PaginatedResponse<Category>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Inventory Categories', href: route('inventory.categories.index') },
];

export default function Index({ categories }: IndexProps) {
    const { flash } = usePage<SharedData>().props;
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const { delete: destroy, processing } = useForm();

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleDelete = () => {
        if (!categoryToDelete) return;
        destroy(route('inventory.categories.destroy', categoryToDelete.id), {
            preserveScroll: true,
            onSuccess: () => setCategoryToDelete(null),
            onError: () => toast.error('An unexpected error occurred.'),
            onFinish: () => setCategoryToDelete(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Categories" />

            <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the category "{categoryToDelete?.name}". You cannot delete a category that is assigned to inventory items.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={processing} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete category
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Heading title="Inventory Categories" description="Group your inventory items for better organization." />
                    <Button asChild>
                        <Link href={route('inventory.categories.create')}>Add New Category</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>All Categories</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.data.length > 0 ? (
                                    categories.data.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell>{cat.inventory_items_count}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={route('inventory.categories.edit', cat.id)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(cat)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No categories found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Pagination links={categories.links} />
            </div>
        </AppLayout>
    );
}
