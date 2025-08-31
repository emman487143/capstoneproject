import { Head, useForm, Link } from '@inertiajs/react';
import { FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryForm from './Partials/CategoryForm';
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Product Categories', href: route('product-categories.index') },
    { title: 'Create', href: route('product-categories.create') },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post(route('product-categories.store'));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product Category" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading title="Create a New Category" description="Add a new category to group your products." />

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
                            Create Category
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
