import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';

import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import CategoryForm from './Partials/CategoryForm';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Inventory Categories', href: route('inventory.categories.index') },
    { title: 'Create', href: route('inventory.categories.create') },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route('inventory.categories.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Category" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between">
                        <Heading title="Create New Category" description="Add a new category to group inventory items." />
                        <div className="flex items-center space-x-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('inventory.categories.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>Create Category</Button>
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
