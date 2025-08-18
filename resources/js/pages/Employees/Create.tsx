import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';
import { BreadcrumbItem, Branch, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import Heading from '@/components/heading';
import EmployeeForm, { EmployeeFormData } from './Partials/EmployeeForm';
import { LoaderCircle } from 'lucide-react';

type CreatePageProps = SharedData & {
    branches: Branch[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Employees', href: route('employees.index') },
    { title: 'Create', href: route('employees.create') },
];

export default function Create({ branches }: CreatePageProps) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm<EmployeeFormData>({
        first_name: '',
        last_name: '',
        job_title: '',
        contact_number: '',
        branch_id: '',
        is_active: true,
        create_user_account: false,
        email: '',
        password: '',
        password_confirmation: '',
        role: 'staff', // Default role
    });

    useEffect(() => {
        if (recentlySuccessful) {
            toast.success('Employee created successfully.');
        }
    }, [recentlySuccessful]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('employees.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Employee" />
            <form onSubmit={submit} className="flex flex-col h-full">
                <div className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <Heading title="Add New Employee" description="Fill in the details to create a new employee." />
                    </div>

                    <EmployeeForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        processing={processing}
                        branches={branches}
                        existingUser={null}
                    />
                </div>

                <div className="flex items-center justify-end gap-4 p-4 bg-background/80 backdrop-blur-sm border-t sticky bottom-0 sm:static">
                    <Button variant="outline" asChild>
                        <Link href={route('employees.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Employee
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
