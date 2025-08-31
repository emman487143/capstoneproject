import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageProps, InventoryItem, Branch, BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { PackagePlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { BatchForm, BatchFormData } from './Partials/BatchForm';
import { format } from 'date-fns';

interface CreateBatchProps extends PageProps {
    items: InventoryItem[];
    branches: Branch[];
    preselectedItem?: InventoryItem | null;
    preselectedBranch?: Branch | null;
    isBranchLocked?: boolean;
    isItemLocked?: boolean; // <-- Add this
    old?: {
        inventory_item_id?: string;
        branch_id?: string;
        source?: string;
    };
}

export default function CreateInventoryBatch(props: PageProps<CreateBatchProps>) {
    const { items, branches, errors, old, preselectedItem, preselectedBranch, isBranchLocked, isItemLocked } = props;

    const breadcrumbs: BreadcrumbItem[] = [

        { title: 'Inventory', href: route('inventory.index') },
        {
            title: preselectedItem ? preselectedItem.name : 'Items',
            href: preselectedItem
                ? route('inventory.items.batches.index', {
                      item: preselectedItem.id, branch: preselectedBranch?.id,
                  })
                : route('inventory.items.index'),
        },
        { title: 'Create Batch', href: '#' },
    ];

      const { data, setData, post, processing, wasSuccessful, recentlySuccessful, reset } = useForm<BatchFormData>({
    inventory_item_id: preselectedItem?.id ? String(preselectedItem.id) : old?.inventory_item_id || '',
    branch_id: preselectedBranch ? String(preselectedBranch.id) : old?.branch_id || '',
    source: old?.source || '',
    quantity_received: '',
    unit_cost: '',
    total_cost: '',
    // Set received_at to noon today to avoid timezone issues
    received_at: (() => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    })(),
    expiration_date: undefined,
    action: 'save',
});


    const selectedItem = useMemo(() => {
        if (preselectedItem && data.inventory_item_id === String(preselectedItem.id)) {
            return preselectedItem;
        }
        return items.find((item) => String(item.id) === data.inventory_item_id);
    }, [data.inventory_item_id, items, preselectedItem]);

    useEffect(() => {
        if (wasSuccessful && data.action === 'save_and_add_another') {
            reset('quantity_received', 'unit_cost', 'expiration_date', 'source');
            setData('received_at', new Date()); // Reset received_at to today
            if (!isItemLocked) {
                reset('inventory_item_id');
            }
            if (!isBranchLocked) {
                reset('branch_id');
            }
            toast.success('Batch saved successfully!');
        }
    }, [wasSuccessful, reset, isBranchLocked, isItemLocked]);

    function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Create a typed copy for submission with formatted dates
    const submitData: Record<string, any> = {};

    // Copy all fields except dates
    Object.keys(data).forEach(key => {
        if (key !== 'received_at' && key !== 'expiration_date') {
            submitData[key] = data[key as keyof typeof data];
        }
    });

    // Format dates as strings for API
    if (data.received_at) {
        submitData.received_at = format(data.received_at, 'yyyy-MM-dd');
    }

    if (data.expiration_date) {
        submitData.expiration_date = format(data.expiration_date, 'yyyy-MM-dd');
    }

    // Post with correct options structure
    post(route('inventory.batches.store'), {
        preserveScroll: true,
    onError: (errors) => {
        console.error('Batch submission failed:', errors);
        toast.error('Failed to Create Batch. Please check the form for errors.');
    }
    });
}

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='Add Inventory Batch' />

            <div className='p-4 lg:p-6'>
                <Card className='mx-auto max-w-4xl'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <PackagePlus className='h-6 w-6' />
                            Add New Inventory Batch
                        </CardTitle>
                        <CardDescription>
                            Enter the details for a new inventory delivery. The system will track it based on the
                            item's configuration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BatchForm
                             data={data}
    setData={setData}
    errors={errors}
    processing={processing}
    onSubmit={submit}
    inventoryItems={items}
    branches={branches}
    selectedItem={selectedItem}
    isItemLocked={isItemLocked}
    isBranchLocked={isBranchLocked}

                        >
                            <div className='flex items-center justify-end gap-4'>
                                <Link
                                    href={route('inventory.items.batches.index', {
                                        item: preselectedItem?.id, branch: preselectedBranch?.id
                                    })}
                                >
                                    <Button variant='outline'>Cancel</Button>
                                </Link>
                                <div className='flex items-center gap-2'>
                                    <Button
                                        type='submit'
                                        variant='secondary'
                                        disabled={processing}
                                        onClick={() => setData('action', 'save_and_add_another')}
                                    >
                                        {processing && data.action === 'save_and_add_another'
                                            ? 'Saving...'
                                            : 'Save & Add Another'}
                                    </Button>
                                    <Button type='submit' disabled={processing} onClick={() => setData('action', 'save')}>
                                        {processing && data.action === 'save' ? 'Saving...' : 'Save Batch'}
                                    </Button>
                                </div>
                            </div>
                        </BatchForm>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
