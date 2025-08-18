import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';
import { LoaderCircle, Info } from 'lucide-react';

import {
    BreadcrumbItem,
    InventoryCategory,
    InventoryItem,
    SharedData,
} from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import ItemForm from './Partials/ItemForm';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the shape of the branch data within the form
interface BranchStockData {
    branch_id: number;
    name: string;
    is_stocked: boolean;
    low_stock_threshold: number | string;
    is_active: boolean; // Keep is_active and remove the duplicate with is_archived
}

// Base type for the item form data, consistent with the partial
export interface ItemFormData {
    name: string;
    code: string;
    description: string;
    unit: string;
    inventory_category_id: number | string;
    tracking_type: 'by_measure' | 'by_portion';
    days_to_warn_before_expiry: number | null; // Changed to match ItemForm expectations
    [key: string]: any;
}

// Combine the base form data with our branches array for the full form state.
type EditItemFormData = ItemFormData & {
    branches: BranchStockData[];
};

interface EditProps extends SharedData {
    item: InventoryItem;
    categories: InventoryCategory[];
    branches: BranchStockData[];
    isBatched: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Manage Items', href: route('inventory.items.index') },
    { title: 'Edit Item', href: '' },
];

export default function Edit({ item, categories, branches, isBatched }: EditProps) {
    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm<EditItemFormData>({
            name: item.name,
             code: item.code || '',
            description: item.description || '',
            unit: item.unit,
            inventory_category_id: String(item.inventory_category_id || ''),
            tracking_type: item.tracking_type,
            days_to_warn_before_expiry: item.days_to_warn_before_expiry || 7, // This is a number, which is good
            branches: branches, // Initialize with data from controller
        });

    // Cast errors to handle Laravel's dot-notation for nested validation.
    const formErrors: Record<string, string | undefined> = errors;

    useEffect(() => {
        if (recentlySuccessful) {
            toast.success('Item updated successfully.');
        }
    }, [recentlySuccessful]);

    const handleBranchStockChange = (
        index: number,
        field: keyof BranchStockData,
        value: string | boolean | number,
    ) => {
        setData(
            'branches',
            data.branches.map((branch, i) =>
                i === index ? { ...branch, [field]: value } : branch,
            ),
        );
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('inventory.items.update', item.id), {
            onError: (errorObject) => {
                if (Object.keys(errorObject).length > 0) {
                    toast.error('Please review the form for errors.');
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${item.name}`} />
            <form onSubmit={handleSubmit}>
                <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <Heading
                            title="Edit Item"
                            description={`Update the details for ${item.name}.`}
                        />
                        <div className="flex items-center space-x-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('inventory.items.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <ItemForm
                                data={data}
                                setData={setData}
                                errors={errors}
                                processing={processing}
                                categories={categories}
                                isEditMode={true}
                                hasBatches={isBatched}
                            />
                        </div>

                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Branch Availability</CardTitle>
                                    <CardDescription>
                                        Manage which branches stock this item and set low stock alerts.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {data.branches.length > 0 ? (
                                        data.branches.map((branch, index) => (
                                            <div
                                                key={branch.branch_id}
                                                className="flex flex-col gap-4 rounded-md border p-4"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <Checkbox
                                                        id={`branch-stocked-${branch.branch_id}`}
                                                        checked={branch.is_stocked}
                                                        onCheckedChange={(checked) =>
                                                            handleBranchStockChange(
                                                                index,
                                                                'is_stocked',
                                                                !!checked,
                                                            )
                                                        }
                                                        className="mt-1"
                                                    />
                                                    <Label
                                                        htmlFor={`branch-stocked-${branch.branch_id}`}
                                                        className="flex-grow font-medium leading-none"
                                                    >
                                                        {branch.name}
                                                        {!branch.is_active && (
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                                (Archived)
                                                            </span>
                                                        )}
                                                    </Label>
                                                </div>
                                                {branch.is_stocked && (
                                                    <div className="space-y-1 pl-8">
                                                        <Label
                                                            htmlFor={`branch-threshold-${branch.branch_id}`}
                                                            className="text-sm font-normal text-muted-foreground"
                                                        >
                                                            Low Stock Threshold
                                                        </Label>
                                                        <Input
                                                            id={`branch-threshold-${branch.branch_id}`}
                                                            type="number"
                                                            placeholder="e.g., 10"
                                                            className="h-8"
                                                            value={branch.low_stock_threshold}
                                                            onChange={(e) =>
                                                                handleBranchStockChange(
                                                                    index,
                                                                    'low_stock_threshold',
                                                                    e.target.value,
                                                                )
                                                            }
                                                            disabled={!branch.is_stocked}
                                                        />
                                                        <InputError
                                                            message={
                                                                formErrors[
                                                                    `branches.${index}.low_stock_threshold`
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>No Branches Available</AlertTitle>
                                            <AlertDescription>
                                                There are no branches to assign this item to.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
