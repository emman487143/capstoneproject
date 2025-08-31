import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import ProductForm from './Partials/ProductForm';
import { type BreadcrumbItem, type InventoryItem, type ProductCategory, type Product, type Branch, type SharedData } from '@/types';

interface BranchAvailabilityData {
    branch_id: number;
    name: string;
    is_available: boolean;
}

interface EditProps extends SharedData {
    product: Product & { branches?: { id: number; name: string; pivot: { is_available: boolean } }[] };
    categories: ProductCategory[];
    inventoryItems: InventoryItem[];
    branches: Branch[];
}

export default function Edit({ product, categories, inventoryItems, branches }: EditProps) {
    // Prepare branch data from product or use all branches
    const initialBranches = branches.map(branch => {
        const existingBranch = product.branches?.find(b => b.id === branch.id);
        return {
            branch_id: branch.id,
            name: branch.name,
            is_available: existingBranch ? existingBranch.pivot.is_available : false
        };
    });

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: product.name,
        description: product.description || '',
        price: product.price,
        product_category_id: product.product_category_id?.toString() || null,
        is_addon: product.is_addon,
        is_active: product.is_active,
        image: null,
        ingredients:
            product.ingredients?.map((ing) => ({
                inventory_item_id: ing.id.toString(),
                quantity_required: ing.pivot.quantity_required.toString(),
            })) || [],
        branches: initialBranches,
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('products.update', product.id), {
            forceFormData: true,
        });
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: route('dashboard') },
        { title: 'Products', href: route('products.index') },
        { title: product.name, href: '#' },
    ];

    // Type-safe branch update function
    const updateBranches = (newBranches: BranchAvailabilityData[]) => {
        setData('branches', newBranches);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${product.name}`} />
            <div className="p-4 sm:p-6 lg:p-8">
                <Heading
                    title={`Edit ${product.name}`}
                    description="Update product details and recipe ingredients"
                />

                <form onSubmit={handleSubmit} className="mt-6">
                    {/* Single column layout with vertical stacking */}
                    <div className="space-y-6 max-w-4xl">
                        {/* Product form details, now includes branch availability */}
                        <ProductForm
                            data={data}
                            setData={setData}
                            errors={errors}
                            categories={categories}
                            inventoryItems={inventoryItems}
                            existingProduct={product}
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
                                Save Changes
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
                            Save Changes
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="flex-1"
                        >
                            <Link href={route('products.index')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Link>
                        </Button>
                    </div>

                    {/* Bottom spacing to prevent content from being hidden behind mobile action bar */}
                    <div className="h-20 lg:hidden"></div>
                </form>
            </div>
        </AppLayout>
    );
}
