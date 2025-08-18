import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Branch, BreadcrumbItem, PaginatedResponse, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { LoaderCircle, PlusCircle, Archive } from 'lucide-react';
import Pagination from '@/components/pagination';
import Heading from '@/components/heading';
import { Label } from '@/components/ui/label';
import BranchCard from './Partials/BranchCard';

type IndexPageProps = SharedData & {
    branches: PaginatedResponse<Branch & { employees_count: number; near_expiry_portions_count: number }>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Branches', href: route('branches.index') },
];

export default function Index({ branches }: IndexPageProps) {
    const { flash } = usePage<SharedData>().props;
    const [isProcessing, setIsProcessing] = useState(false);
    const [branchToArchive, setBranchToArchive] = useState<Branch | null>(null);
    const [confirmationText, setConfirmationText] = useState('');

    const isArchiveDisabled = confirmationText !== 'archive' || isProcessing;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleArchive = () => {
        if (!branchToArchive) return;
        setIsProcessing(true);
        router.delete(route('branches.destroy', branchToArchive.id), {
            preserveScroll: true,
            onSuccess: () => setBranchToArchive(null),
            onFinish: () => {
                setIsProcessing(false);
                setConfirmationText('');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branches" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                    <Heading title="Branches" description="Manage your restaurant locations" />
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('branches.archived')}>
                                <Archive className="h-4 w-4 mr-2" />
                                View Archived
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={route('branches.create')}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add New Branch
                            </Link>
                        </Button>
                    </div>
                </div>

                {branches.data.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {branches.data.map((branch) => (
                            <BranchCard key={branch.id} branch={branch} onArchive={setBranchToArchive} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <h3 className="text-lg font-semibold">No Branches Found</h3>
                        <p>Get started by adding your first branch.</p>
                    </div>
                )}

                <Pagination links={branches.links} />
            </div>

            <AlertDialog
                open={!!branchToArchive}
                onOpenChange={(open) => {
                    if (!open) {
                        setBranchToArchive(null);
                        setConfirmationText('');
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to archive?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will hide the{' '}
                            <span className="font-semibold text-foreground">{branchToArchive?.name}</span> branch from
                            active use. You can restore it later from the archived view.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="archive-confirm">
                            Please type <span className="font-bold text-foreground">archive</span> to confirm.
                        </Label>
                        <Input
                            id="archive-confirm"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleArchive}
                            disabled={isArchiveDisabled}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isProcessing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Archive Branch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
