import { Head, useForm, Link } from '@inertiajs/react';
import { PageProps, InventoryCategory, Branch } from '@/types';
import ItemForm from './Partials/ItemForm';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';
import { LoaderCircle } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';

interface CreateProps extends PageProps {
    categories: InventoryCategory[];
    branches: Branch[];
}

// Define the shape of the branch data within the form
interface BranchStockData {
    branch_id: number;
    name: string;
    is_stocked: boolean;
    low_stock_threshold: number | string;
}

// This is a base type for the item form data
export interface ItemFormData {
    name: string;
    code: string;
    description: string;
    unit: string;
    inventory_category_id: number | string;
    tracking_type: 'by_measure' | 'by_portion';
    days_to_warn_before_expiry: number | null; // Changed to match ItemForm expectations
    [key: string]: any; // Added to allow for additional properties
}

// Combine the base form data with our new branches array.
type CreateItemFormData = ItemFormData & {
    branches: BranchStockData[];
    [key: string]: any; // Add index signature to satisfy FormDataConvertible constraint
};

export default function Create({ categories, branches }: CreateProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inventory', href: route('inventory.index') },
        { title: 'Create Item', href: route('inventory.items.create') },
    ];

    // The useForm hook can handle the nested state, but we need to manage types carefully.
    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm<CreateItemFormData>({
        name: '',
        code: '',
        description: '',
        unit: '',
        inventory_category_id: '',
        tracking_type: 'by_portion',
        days_to_warn_before_expiry: 7, // This is already a number, which is good
        branches: branches.map((branch: Branch) => ({
            branch_id: branch.id,
            name: branch.name,
            is_stocked: true,
            low_stock_threshold: 10,
        })),
    });

    // Cast errors to a more flexible type to handle Laravel's dot-notation for nested validation.
    const formErrors: Record<string, string | undefined> = errors;

    useEffect(() => {
        if (recentlySuccessful) {
            reset();
        }
    }, [recentlySuccessful]);

    const handleBranchStockChange = (index: number, field: keyof BranchStockData, value: string | boolean) => {
        // This is a safe way to update an array in form state with TypeScript
        setData('branches', data.branches.map((branch: BranchStockData, i: number) => i === index ? { ...branch, [field]: value } : branch));
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('inventory.items.store'), {
            onSuccess: () => {
                // Success toast is handled by the redirect from the controller.
            },
            onError: (errorObject) => {
                // Check if there are any errors before showing a generic toast
                if (Object.keys(errorObject).length > 0) {
                    toast.error('Please review the form for errors.');
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Inventory Item" />
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading
                    title="Create New Inventory Item"
                    description="Add a new ingredient or supply to the system."
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <ItemForm
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            categories={categories}
                        />
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branch Availability</CardTitle>
                                <CardDescription>
                                    Select which branches will stock this item and set their low stock alerts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.branches.map((branch: BranchStockData, index: number) => (
                                    <div key={branch.branch_id} className="flex items-start gap-4 p-3 rounded-md border">
                                        <Checkbox
                                            id={`branch-stocked-${branch.branch_id}`}
                                            checked={branch.is_stocked}
                                            onCheckedChange={(checked) =>
                                                handleBranchStockChange(index, 'is_stocked', !!checked)
                                            }
                                            className="mt-1"
                                        />
                                        <div className="grid flex-1 gap-2">
                                            <Label htmlFor={`branch-stocked-${branch.branch_id}`} className="font-medium leading-none">
                                                {branch.name}
                                            </Label>
                                            <div className="space-y-1">
                                                <Label htmlFor={`branch-threshold-${branch.branch_id}`} className="text-sm font-normal text-muted-foreground">
                                                    Low Stock Threshold
                                                </Label>
                                                <Input
                                                    id={`branch-threshold-${branch.branch_id}`}
                                                    type="number"
                                                    placeholder="e.g., 10"
                                                    className="h-8"
                                                    value={branch.low_stock_threshold}
                                                    onChange={(e) =>
                                                        handleBranchStockChange(index, 'low_stock_threshold', e.target.value)
                                                    }
                                                    disabled={!branch.is_stocked}
                                                />
                                                {/* CORRECTED: This safely accesses the flattened error key */}
                                                <InputError message={formErrors[`branches.${index}.low_stock_threshold`]} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href={route('inventory.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Create Item
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
