import AppLayout from '@/layouts/app-layout';
import { InventoryBatch, InventoryBatchPortion, PageProps, Paginator } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type BreadcrumbItem } from '@/types';
import Pagination from '@/components/pagination';
import { format } from 'date-fns';
import Heading from '@/components/heading';

interface IndexProps extends PageProps {
    batch: InventoryBatch;
    portions: Paginator<InventoryBatchPortion>;
}

export default function Index({ batch, portions }: IndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: route('dashboard') },
        { title: 'Inventory', href: route('inventory.index') },
        {
            title: `Batches for ${batch.inventory_item.name}`,
            href: route('inventory.batches.index', { item_id: batch.inventory_item.id }),
        },
        { title: `Portions for Batch #${batch.id}`, href: '#' },
    ];

    const pageTitle = `Portions for Batch #${batch.id}`;
    const pageDescription = `A list of all portions created from batch #${batch.id} of ${batch.inventory_item.name}.`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading title={pageTitle} description={pageDescription} />

                <Card>
                    <CardContent className="pt-6">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Portion ID</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead className="text-right">Quantity Used</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {portions.data.length > 0 ? (
                                        portions.data.map((portion) => (
                                            <TableRow key={portion.id}>
                                                <TableCell className="font-mono">{portion.id}</TableCell>
                                                <TableCell>{format(new Date(portion.created_at), 'PPP p')}</TableCell>
                                                <TableCell className="text-right">{portion.quantity}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">
                                                No portions found for this batch.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {portions.meta && portions.meta.last_page > 1 && <Pagination links={portions.meta.links} />}
                </Card>
            </div>
        </AppLayout>
    );
}
