import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryForm from './Partials/CategoryForm';
import { BreadcrumbItem, SharedData, ProductCategory } from '@/types';

interface EditProps extends SharedData {
    category: ProductCategory;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Product Categories', href: route('product-categories.index') },
    { title: 'Edit', href: '#' },
];

export default function Edit({ category }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: category.name,
        description: category.description || '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        put(route('product-categories.update', category.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${category.name}`} />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading title="Edit Category" description="Update the details for this product category." />

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Category Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CategoryForm {...{ data, setData, errors }} />
                        </CardContent>
                    </Card>

                    <div className="mt-6 flex justify-end gap-4">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('product-categories.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
