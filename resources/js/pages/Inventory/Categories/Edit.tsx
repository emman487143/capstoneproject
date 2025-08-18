import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';

import { BreadcrumbItem, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import CategoryForm from './Partials/CategoryForm';

interface Category {
    id: number;
    name: string;
}

interface EditProps extends SharedData {
    category: Category;
}

export default function Edit({ category }: EditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: route('dashboard') },
        { title: 'Inventory Categories', href: route('inventory.categories.index') },
        { title: 'Edit', href: route('inventory.categories.edit', category.id) },
    ];

    const { data, setData, put, processing, errors } = useForm({ name: category.name });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('inventory.categories.update', category.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit - ${category.name}`} />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between">
                        <Heading title="Edit Category" description={`Update the details for ${category.name}.`} />
                        <div className="flex items-center space-x-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('inventory.categories.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>Save Changes</Button>
                        </div>
                    </div>
                    <div className="mt-6">
                        <CategoryForm data={data} setData={setData} errors={errors} processing={processing} />
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
