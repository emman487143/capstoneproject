import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';
import { BreadcrumbItem, Branch, Employee, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import Heading from '@/components/heading';
import EmployeeForm, { EmployeeFormData } from './Partials/EmployeeForm';
import { LoaderCircle } from 'lucide-react';

type EditPageProps = SharedData & {
    employee: Employee;
    branches: Branch[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Employees', href: route('employees.index') },
    { title: 'Edit', href: '#' },
];

export default function Edit({ employee, branches }: EditPageProps) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm<EmployeeFormData>({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        job_title: employee.job_title || '',
        contact_number: employee.contact_number || '',
        branch_id: String(employee.branch?.id ?? ''),
        is_active: employee.is_active,
        create_user_account: !!employee.user,
        email: employee.user?.email || '',
        password: '',
        password_confirmation: '',
        role: employee.user?.role || 'staff',
    });

    useEffect(() => {
        if (recentlySuccessful) {
            toast.success('Employee updated successfully.');
        }
    }, [recentlySuccessful]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('employees.update', employee.id));
    };

    // CRITICAL FIX: This logic safely handles cases where an employee's assigned
    // branch has been archived. It ensures the archived branch is still available
    // in the dropdown for selection, resolving the 'possibly null' error.
    const getAugmentedBranches = () => {
        if (employee.branch) {
            const isEmployeeBranchInList = branches.some((b) => b.id === employee.branch!.id);
            if (!isEmployeeBranchInList) {
                return [employee.branch, ...branches];
            }
        }
        return branches;
    };
    const augmentedBranches = getAugmentedBranches();

   return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Employee" />
            <form onSubmit={submit} className="flex flex-col h-full">
                <div className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <Heading title="Edit Employee" description="Update the details for this employee." />
                    </div>

                    <EmployeeForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        processing={processing}
                        branches={augmentedBranches}
                        existingUser={employee.user || null}
                    />
                </div>

                <div className="flex items-center justify-end gap-4 p-4 bg-background/80 backdrop-blur-sm border-t sticky bottom-0 sm:static">
                    <Button variant="outline" asChild>
                        <Link href={route('employees.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
