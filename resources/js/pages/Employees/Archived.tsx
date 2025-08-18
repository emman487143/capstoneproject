import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Employee, BreadcrumbItem, PaginatedResponse, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
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
import { LoaderCircle, Undo2 } from 'lucide-react';
import Pagination from '@/components/pagination';
import Heading from '@/components/heading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ArchivedPageProps = SharedData & {
    employees: PaginatedResponse<Employee>;
    filters: { search: string | null };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Employees', href: route('employees.index') },
    { title: 'Archived', href: route('employees.archived') },
];

export default function Archived({ employees, filters }: ArchivedPageProps) {
    const { flash } = usePage<SharedData>().props;
    const [isProcessing, setIsProcessing] = useState(false);
    const [employeeToRestore, setEmployeeToRestore] = useState<Employee | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash]);

    const handleRestore = () => {
        if (!employeeToRestore) return;
        setIsProcessing(true);
        router.post(
            route('employees.restore', employeeToRestore.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setEmployeeToRestore(null),
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Archived Employees" />
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Heading title="Archived Employees" description="Employees that have been archived can be restored here." />
            {employees.data.length > 0 ? (
                <>
                    {/* Desktop Table View */}
                    <div className="rounded-md border hidden md:block">
                        <table className="w-full text-sm">
                            <thead className="text-left">
                                <tr className="border-b">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Job Title</th>
                                    <th className="p-4 font-medium">Archived On</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.data.map((employee) => (
                                    <tr key={employee.id} className="border-b">
                                        <td className="p-4 font-medium">{employee.full_name}</td>
                                        <td className="p-4 text-muted-foreground">{employee.branch?.name ?? 'N/A'}</td>
                                        <td className="p-4 text-muted-foreground">{employee.job_title}</td>
                                        <td className="p-4 text-muted-foreground">
                                            {employee.deleted_at
                                                ? format(new Date(employee.deleted_at), 'PPP')
                                                : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEmployeeToRestore(employee)}
                                            >
                                                <Undo2 className="mr-2 h-4 w-4" />
                                                Restore
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="space-y-4 md:hidden">
                        {employees.data.map((employee) => (
                            <Card key={employee.id}>
                                <CardHeader>
                                    <CardTitle>{employee.full_name}</CardTitle>
                                    <CardDescription>{employee.job_title}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Branch</span>
                                        <span>{employee.branch?.name ?? 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Archived On</span>
                                        <span>
                                            {employee.deleted_at
                                                ? format(new Date(employee.deleted_at), 'PPP')
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => setEmployeeToRestore(employee)}
                                    >
                                        <Undo2 className="mr-2 h-4 w-4" />
                                        Restore Employee
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground py-12">
                    <h3 className="text-lg font-semibold">No Archived Employees</h3>
                    <p>There are currently no archived employees to display.</p>
                </div>
            )}

            <Pagination links={employees.links} />
        </div>

            <AlertDialog open={!!employeeToRestore} onOpenChange={(open) => !open && setEmployeeToRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to restore?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make the employee{' '}
                            <span className="font-semibold text-foreground">{employeeToRestore?.full_name}</span>{' '}
                            active again and visible in the main employee list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={isProcessing}>
                            {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Restore Employee
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
