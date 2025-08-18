import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BatchFormData, BatchForm } from './Partials/BatchForm';
import { PageProps, InventoryBatch, InventoryItem, Branch } from '@/types';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import Heading from '@/components/heading';
import { format } from 'date-fns';

interface EditBatchProps extends PageProps {
    batch: InventoryBatch;
    inventoryItems: InventoryItem[];
    branches: Branch[];
}

export default function Edit({ batch, inventoryItems, branches }: EditBatchProps) {
    // Updated breadcrumbs to use the correct route names
    const breadcrumbs: BreadcrumbItem[] = [

        { title: 'Inventory', href: route('inventory.index') },
        {
            title: batch.inventory_item.name,
            href: route('inventory.items.batches.index', {
                item: batch.inventory_item.id,
            }),
        },
        {
            title: `Batch #${batch.batch_number}`,
            href: route('inventory.batches.show', batch.id),
        },
        {
            title: 'Edit',
            href: route('inventory.batches.edit', batch.id),
        },
    ];

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm<BatchFormData>({
        inventory_item_id: batch.inventory_item_id.toString(),
        branch_id: batch.branch_id.toString(),
        source: batch.source ?? '',
        quantity_received: batch.quantity_received.toString(),
        unit_cost: String(batch.unit_cost ?? ''),
        total_cost:
            batch.inventory_item.tracking_type === 'by_measure'
                ? String((batch.unit_cost ?? 0) * batch.quantity_received)
                : '',
        received_at: batch.received_at ? new Date(batch.received_at) : new Date(),
        expiration_date: batch.expiration_date ? new Date(batch.expiration_date) : undefined,
    });

    useEffect(() => {
        if (recentlySuccessful) {
            toast.success('Batch updated successfully.');
        }
    }, [recentlySuccessful]);

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        // Create a submission object with ONLY the fields allowed to be updated
        const submitData: Record<string, any> = {
            source: data.source,
            unit_cost: data.unit_cost,
            // Don't include inventory_item_id or quantity_received
        };

        // Format dates as strings for API
        if (data.received_at) {
            submitData.received_at = format(data.received_at, 'yyyy-MM-dd');
        }

        if (data.expiration_date) {
            submitData.expiration_date = format(data.expiration_date, 'yyyy-MM-dd');
        }

        // Use the correct route for update
        put(route('inventory.batches.update', batch.id), submitData);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Inventory Batch" />

            <div className="p-4 sm:p-6 lg:p-8">
                <Card className="mx-auto max-w-4xl">
                    <CardHeader>
                        <Heading
                            title="Edit Inventory Batch"
                            description={`Editing batch #${batch.batch_number} for ${batch.inventory_item.name}.`}
                        />
                    </CardHeader>
                    <CardContent>
                        <BatchForm
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            onSubmit={handleSubmit}
                            branches={branches}
                            inventoryItems={inventoryItems}
                            isEditMode={true}
                            batch={batch}
                            isItemLocked={true}
                            isBranchLocked={true}
                        >
                            <div className="flex items-center justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Batch
                                </Button>
                            </div>
                        </BatchForm>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
