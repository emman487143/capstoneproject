import AppLayout from '@/layouts/app-layout';
import { Auth, BreadcrumbItem, PaginatedResponse, Transfer } from '@/types';
import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Pagination from '@/components/pagination';
import StatusBadge from './Partials/StatusBadge';
import { ArrowDownUp, Ban, Package, PackageCheck, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface IndexPageProps {
    pendingTransfers: Transfer[];
    historyTransfers: PaginatedResponse<Transfer>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Transfers', href: route('inventory.transfers.index') },
];

export default function Index({ pendingTransfers, historyTransfers }: IndexPageProps) {
    // Properly type the page props to access auth
    const { auth } = usePage<{ auth: Auth }>().props;

    // Data is now pre-separated by the controller, so no local filtering is needed.

    // Handle quick receive action
    const handleQuickReceive = (transferId: number) => {
        router.get(route('inventory.transfers.show', transferId));
    };

    // Handle quick cancel action
    const handleQuickCancel = (transferId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click navigation

        if (confirm('Are you sure you want to cancel this transfer? This action cannot be undone.')) {
            router.post(route('inventory.transfers.cancel', transferId), {}, {
                onSuccess: () => {
                    toast.success('Transfer cancelled successfully');
                },
                onError: () => {
                    toast.error('Failed to cancel transfer');
                },
                preserveState: true,
            });
        }
    };

    usePoll(10000, {
            only: ['pendingTransfers', 'historyTransfers'],
      onStart() {
          console.log('checking update')
      },
      onFinish() {
          console.log('finished checking')
      }
    })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stock Transfers" />

            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Heading
                        title="Stock Transfers"
                        description="Manage the movement of inventory between your branches."
                    />
                    <Button asChild className="self-start sm:self-auto">
                        <Link href={route('inventory.transfers.create')}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            New Transfer
                        </Link>
                    </Button>
                </div>

                {/* Pending Transfers Section */}
                {pendingTransfers.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ArrowDownUp className="h-4 w-4 text-amber-500" />
                                        Pending Transfers
                                    </CardTitle>
                                    <CardDescription>
                                        Transfers awaiting reception or cancellation
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="self-start sm:self-auto bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800">
                                    {pendingTransfers.length} pending
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingTransfers.map((transfer) => {
                                            // Determine if current user can take action on this transfer based on branch
                                            const isReceiver = auth.user.employee?.branch_id === transfer.destination_branch.id;
                                            const isSender = auth.user.employee?.branch_id === transfer.source_branch.id;

                                            return (
                                                <TableRow
                                                    key={transfer.id}
                                                    className="cursor-pointer"
                                                    onClick={() => router.get(route('inventory.transfers.show', transfer.id))}
                                                >
                                                    <TableCell className="font-mono text-xs">#{transfer.id}</TableCell>
                                                    <TableCell>{transfer.source_branch.name}</TableCell>
                                                    <TableCell>{transfer.destination_branch.name}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {/* Show receive button for destination branch users */}
                                                            {isReceiver && (
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleQuickReceive(transfer.id);
                                                                    }}
                                                                >
                                                                    <PackageCheck className="h-4 w-4 mr-1" />
                                                                    Receive
                                                                </Button>
                                                            )}

                                                            {/* Show cancel button for source branch users */}
                                                            {isSender && (
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={(e) => handleQuickCancel(transfer.id, e)}
                                                                >
                                                                    <Ban className="h-4 w-4 mr-1" />
                                                                    Cancel
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {pendingTransfers.map((transfer) => {
                                    const isReceiver = auth.user.employee?.branch_id === transfer.destination_branch.id;
                                    const isSender = auth.user.employee?.branch_id === transfer.source_branch.id;

                                    return (
                                        <div
                                            key={transfer.id}
                                            className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                            onClick={() => router.get(route('inventory.transfers.show', transfer.id))}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-xs">#{transfer.id}</span>
                                                <StatusBadge status="pending" size="sm" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">From</p>
                                                    <p className="font-medium">{transfer.source_branch.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">To</p>
                                                    <p className="font-medium">{transfer.destination_branch.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Date</p>
                                                    <p className="font-medium">{format(new Date(transfer.sent_at), 'MMM dd, yyyy')}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                                {isReceiver && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuickReceive(transfer.id);
                                                        }}
                                                    >
                                                        <PackageCheck className="h-4 w-4 mr-1" />
                                                        Receive
                                                    </Button>
                                                )}
                                                {isSender && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={(e) => handleQuickCancel(transfer.id, e)}
                                                    >
                                                        <Ban className="h-4 w-4 mr-1" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Transfer History Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Transfer History</CardTitle>
                        <CardDescription>
                            Completed and cancelled transfers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead className="text-right">Date Sent</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyTransfers.data.length > 0 ? (
                                        historyTransfers.data.map((transfer) => (
                                            <TableRow
                                                key={transfer.id}
                                                className="cursor-pointer"
                                                onClick={() => router.get(route('inventory.transfers.show', transfer.id))}
                                            >
                                                <TableCell className="font-mono text-xs">#{transfer.id}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={transfer.status} />
                                                </TableCell>
                                                <TableCell>{transfer.source_branch.name}</TableCell>
                                                <TableCell>{transfer.destination_branch.name}</TableCell>
                                                <TableCell className="text-right">
                                                    {format(new Date(transfer.sent_at), 'MMM dd, yyyy')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Package className="h-8 w-8" />
                                                <span>No completed transfers found.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {historyTransfers.data.length > 0 ? (
                                historyTransfers.data.map((transfer) => (
                                    <div
                                        key={transfer.id}
                                        className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                        onClick={() => router.get(route('inventory.transfers.show', transfer.id))}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs">#{transfer.id}</span>
                                            <StatusBadge status={transfer.status} size="sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">From</p>
                                                <p className="font-medium">{transfer.source_branch.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">To</p>
                                                <p className="font-medium">{transfer.destination_branch.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Date</p>
                                                <p className="font-medium">{format(new Date(transfer.sent_at), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                    <Package className="h-8 w-8 mb-2" />
                                    <span>No completed transfers found.</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {historyTransfers.links && <Pagination links={historyTransfers.links} />}
            </div>
        </AppLayout>
    );
}
