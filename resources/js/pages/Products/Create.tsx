import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import ProductForm from './Partials/ProductForm';
import BranchAvailability from './Partials/BranchAvailability';
import { type BreadcrumbItem, type InventoryItem, type ProductCategory, type Branch, type SharedData } from '@/types';

// Define the branch availability type to ensure consistency
interface BranchAvailabilityData {
    branch_id: number;
    name: string;
    is_available: boolean;
}

// Define the form data structure
interface ProductFormData {
    name: string;
    description: string;
    price: string;
    product_category_id: string | null;
    is_addon: boolean;
    is_active: boolean;
    image: File | null;
    ingredients: Array<{
        inventory_item_id: string;
        quantity_required: string;
    }>;
    branches: BranchAvailabilityData[];
    [key: string]: any; // Add index signature to satisfy FormDataType constraint
}

interface CreateProps extends SharedData {
    categories: ProductCategory[];
    inventoryItems: InventoryItem[];
    branches: Branch[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Products', href: route('products.index') },
    { title: 'Create', href: route('products.create') },
];

export default function Create({ categories, inventoryItems, branches }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm<ProductFormData>({
        name: '',
        description: '',
        price: '',
        product_category_id: null,
        is_addon: false,
        is_active: true,
        image: null,
        ingredients: [],
        branches: branches.map(branch => ({
            branch_id: branch.id,
            name: branch.name,
            is_available: true
        })),
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('products.store'));
    }

    // Type-safe branch update function
    const updateBranches = (newBranches: BranchAvailabilityData[]) => {
        setData('branches', newBranches);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product" />
            <div className="p-4 sm:p-6 lg:p-8">
                <Heading title="Create New Product" description="Add a new item to your menu with recipe details" />

                <form onSubmit={handleSubmit} className="mt-6">
                    <div className="space-y-6 max-w-4xl">
                        <ProductForm
                            data={data}
                            setData={setData}
                            errors={errors}
                            categories={categories}
                            inventoryItems={inventoryItems}
                            branches={data.branches}
                            setBranches={updateBranches}
                        />

                        {/* Desktop action buttons */}
                        <div className="hidden lg:flex items-center justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                            >
                                <Link href={route('products.index')}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Products
                                </Link>
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                            >
                                {processing ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Create Product
                            </Button>
                        </div>
                    </div>

                    {/* Mobile action bar - fixed at the bottom */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10 flex gap-3 lg:hidden">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="flex-1"
                        >
                            {processing ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Create Product
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="flex-1"
                        >
                            <Link href={route('products.index')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back Back
                            </Link>
                        </Button>
                    </div>

                    <div className="h-20 lg:hidden"></div>
                </form>
            </div>
        </AppLayout>
    );
}
