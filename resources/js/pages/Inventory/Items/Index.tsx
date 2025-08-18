import { BreadcrumbItem, InventoryItem, PaginatedResponse, SharedData, Paginator } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Edit, MoreHorizontal, Package, Tag, Ruler } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import Pagination from '@/components/pagination';
import Heading from '@/components/heading';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type IndexPageProps = SharedData & {
    items: Paginator<InventoryItem>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Manage Items', href: route('inventory.items.index') },
];

export default function Index({ items: paginatedItems }: IndexPageProps) {
    const { flash } = usePage<SharedData>().props;
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const { delete: destroy, processing } = useForm();

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        } else if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleDelete = () => {
        if (itemToDelete) {
            destroy(route('inventory.items.destroy', itemToDelete.id), {
                preserveScroll: true,
                onSuccess: () => setItemToDelete(null),
                onError: () => toast.error('An unexpected error occurred while deleting the item.'),
                onFinish: () => setItemToDelete(null),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Items" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Manage Items"
                        description="Manage your restaurant's master list of ingredients."
                    />
                    <Button asChild>
                        <Link href={route('inventory.items.create')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Item
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>All Inventory Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop Table View */}
                        <div className="rounded-md border hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Unit of Measure</TableHead>
                                        <TableHead>Tracking Type</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedItems.data.length > 0 ? (
                                        paginatedItems.data.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.category?.name || 'N/A'}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {item.tracking_type.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link href={route('inventory.items.edit', item.id)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setItemToDelete(item)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No inventory items found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                         <div className="grid grid-cols-1 gap-4 md:hidden">
                            {paginatedItems.data.length > 0 ? (
                                paginatedItems.data.map((item) => (
                                    <Card key={item.id} className="flex flex-col">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1.5">
                                                    <CardTitle>{item.name}</CardTitle>
                                                    <CardDescription className="flex items-center pt-1">
                                                        <Tag className="mr-2 h-4 w-4" />
                                                        {item.category?.name || 'N/A'}
                                                    </CardDescription>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 flex-shrink-0"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Open menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={route('inventory.items.edit', item.id)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onSelect={() => setItemToDelete(item)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-4">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Ruler className="mr-2 h-4 w-4" />
                                                <span>Unit: {item.unit}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Package className="mr-2 h-4 w-4" />
                                                <span>
                                                    Tracking:{' '}
                                                    <Badge variant="secondary" className="ml-1">
                                                        {item.tracking_type.replace('_', ' ')}
                                                    </Badge>
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    No inventory items found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                {paginatedItems.meta && paginatedItems.meta.last_page > 1 && (
                    <div className="mt-6 flex justify-center">
                        <Pagination links={paginatedItems.meta.links} />
                    </div>
                )}
            </div>

            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item "
                            {itemToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={processing}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
