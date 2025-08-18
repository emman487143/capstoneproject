import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Branch, BreadcrumbItem, PaginatedResponse, SharedData } from '@/types';
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
import { LoaderCircle, MapPin, Undo2, Users } from 'lucide-react';
import Pagination from '@/components/pagination';
import Heading from '@/components/heading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ArchivedPageProps = SharedData & {
    branches: PaginatedResponse<Branch & { employees_count: number }>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'Branches', href: route('branches.index') },
    { title: 'Archived', href: route('branches.archived') },
];

export default function Archived({ branches }: ArchivedPageProps) {
    const { flash } = usePage<SharedData>().props;
    const [isProcessing, setIsProcessing] = useState(false);
    const [branchToRestore, setBranchToRestore] = useState<Branch | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash]);

    const handleRestore = () => {
        if (!branchToRestore) return;
        setIsProcessing(true);
        router.post(route('branches.restore', branchToRestore.id), {}, {
            preserveScroll: true,
            onSuccess: () => setBranchToRestore(null),
            onFinish: () => setIsProcessing(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Archived Branches" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading
                    title="Archived Branches"
                    description="Branches that have been archived can be restored here."
                />

                {branches.data.length > 0 ? (
                    <>
                        {/* Desktop Table View */}
                        <div className="rounded-md border hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="text-left">
                                    <tr className="border-b">
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Address</th>
                                        <th className="p-4">Staff Count</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branches.data.map((branch) => (
                                        <tr key={branch.id} className="border-b">
                                            <td className="p-4">{branch.name}</td>
                                            <td className="p-4">{branch.address}</td>
                                            <td className="p-4">{branch.employees_count}</td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setBranchToRestore(branch)}
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
                            {branches.data.map((branch) => (
                                <Card key={branch.id}>
                                    <CardHeader>
                                        <CardTitle>{branch.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 pt-1">
                                            <MapPin className="h-4 w-4 flex-shrink-0" />
                                            <span>{branch.address}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex items-center text-muted-foreground">
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>{branch.employees_count} Employees</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => setBranchToRestore(branch)}
                                        >
                                            <Undo2 className="mr-2 h-4 w-4" />
                                            Restore Branch
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <h3 className="text-lg font-semibold">No Archived Branches</h3>
                        <p>There are currently no archived branches to display.</p>
                    </div>
                )}

                <Pagination links={branches.links} />
            </div>

            <AlertDialog open={!!branchToRestore} onOpenChange={(open) => !open && setBranchToRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to restore?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make the{' '}
                            <span className="font-semibold text-foreground">{branchToRestore?.name}</span> branch
                            active again and visible throughout the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={isProcessing}>
                            {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Restore Branch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
