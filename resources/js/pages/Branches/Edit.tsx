import { Head } from '@inertiajs/react';
import { Branch, BreadcrumbItem, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import  Heading  from '@/components/heading';
// Import the new InertiaFormProps type from the form partial.
import BranchForm, { InertiaFormProps } from './Partials/BranchForm';

type EditPageProps = SharedData & {
    branch: Branch;
};

export default function EditBranch({ branch }: EditPageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Branches', href: route('branches.index') },
        { title: 'Edit', href: route('branches.edit', branch.id) },
    ];

    // Use the imported type for the form parameter.
    const handleSave = (form: InertiaFormProps) => {
        form.put(route('branches.update', branch.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Branch: ${branch.name}`} />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading
                    title="Edit Branch"
                    description={`Update the details for the ${branch.name} branch.`}
                />
                <Card>
                    <CardHeader>
                        <CardTitle>Branch Details</CardTitle>
                    </CardHeader>
                   <CardContent>
                        <BranchForm branch={branch} onSubmit={handleSave} submitButtonText="Save Changes" />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
