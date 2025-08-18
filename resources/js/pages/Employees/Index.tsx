import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BreadcrumbItem, Employee, PaginatedResponse, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Archive, LoaderCircle, PlusCircle, Search, UserCheck, UserX, X } from 'lucide-react';
import Pagination from '@/components/pagination';
import EmployeeCard from './Partials/EmployeeCard';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';

type IndexPageProps = SharedData & {
    employees: PaginatedResponse<Employee>;
    filters: { search: string | null };
    archivedEmployeesCount: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Employees', href: route('employees.index') },
];

export default function Index({ employees, filters, archivedEmployeesCount }: IndexPageProps) {
    const { auth } = usePage<SharedData>().props;
    const { flash } = usePage<SharedData>().props;
    const [employeeToToggle, setEmployeeToToggle] = useState<Employee | null>(null);
    const [employeeToArchive, setEmployeeToArchive] = useState<Employee | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(route('employees.index'), { search: value }, { preserveState: true, replace: true });
    }, 300);

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        debouncedSearch(value);
    };

    const clearSearch = () => {
        setSearchTerm('');
        router.get(route('employees.index'), {}, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash]);

    const handleToggleStatus = () => {
        if (!employeeToToggle) return;
        setIsProcessing(true);
        router.patch(
            route('employees.deactivate', employeeToToggle.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setEmployeeToToggle(null),
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    const handleArchive = () => {
        if (!employeeToArchive) return;
        setIsProcessing(true);
        router.delete(route('employees.destroy', employeeToArchive.id), {
            preserveScroll: true,
            onSuccess: () => setEmployeeToArchive(null),
            onFinish: () => setIsProcessing(false),
        });
    };

    const toggleAction = employeeToToggle?.is_active ? 'Deactivate' : 'Activate';
    const ToggleIcon = employeeToToggle?.is_active ? UserX : UserCheck;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Heading title="Employees" description="Manage all employees across all branches." />
                    {auth.user.is_admin&&(<div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button variant="outline" asChild disabled={archivedEmployeesCount === 0}>
                            <Link href={route('employees.archived')}>
                                <Archive className="mr-2 h-4 w-4" />
                                View Archived
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={route('employees.create')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Employee
                            </Link>
                        </Button>
                    </div>)}

                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, position, or branch..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-10 w-full md:w-1/3"
                    />
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={clearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {employees.data.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {employees.data.map((employee) => (
                            <EmployeeCard
                                key={employee.id}
                                employee={employee}
                                onToggleStatus={setEmployeeToToggle}
                                onArchive={setEmployeeToArchive}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <h3 className="text-lg font-semibold">
                            {filters.search ? 'No Employees Found' : 'No Employees Created'}
                        </h3>
                        <p>
                            {filters.search
                                ? 'No employees matched your search query.'
                                : 'Get started by adding a new employee.'}
                        </p>
                    </div>
                )}

                <Pagination links={employees.links} />
            </div>

            {/* Deactivate/Activate Dialog */}
            <AlertDialog open={!!employeeToToggle} onOpenChange={(open) => !open && setEmployeeToToggle(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to {toggleAction.toLowerCase()}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will {toggleAction.toLowerCase()} the employee{' '}
                            <span className="font-semibold text-foreground">{employeeToToggle?.full_name}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleToggleStatus} disabled={isProcessing}>
                            {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            <ToggleIcon className="mr-2 h-4 w-4" />
                            {toggleAction} Employee
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Archive Dialog */}
            <AlertDialog open={!!employeeToArchive} onOpenChange={(open) => !open && setEmployeeToArchive(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to archive?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will archive the employee{' '}
                            <span className="font-semibold text-foreground">{employeeToArchive?.full_name}</span>. They
                            can be restored later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleArchive}
                            disabled={isProcessing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Employee
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
