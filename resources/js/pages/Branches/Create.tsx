import { Head, Link } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Heading from '@/components/heading';
import BranchForm, { InertiaFormProps } from './Partials/BranchForm';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Branches', href: route('branches.index') },
    { title: 'Create', href: route('branches.create') },
];

export default function CreateBranch() {
    const handleSave = (form: InertiaFormProps) => {
        form.post(route('branches.store'), {
            onSuccess: () => form.reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Branch" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading title="Create a New Branch" description="Add a new location to the Ramen Dreams system." />
                <Card>
                    <CardHeader>
                        <CardTitle>Branch Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* The form no longer needs its own buttons */}
                        <BranchForm onSubmit={handleSave} submitButtonText="Create Branch" />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
