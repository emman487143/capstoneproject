import AppLayout from '@/layouts/app-layout';
import { Auth, BreadcrumbItem, Transfer } from '@/types';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from './Partials/StatusBadge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Ban, LoaderCircle, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import TransferReceptionForm from './Partials/TransferReceptionForm';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import React from 'react';

interface ShowPageProps {
    transfer: Transfer;
    can: {
        update: boolean;
        cancel: boolean;
    };
}

// Update the Transfer interface to include cancelled_by property
interface ExtendedTransfer extends Transfer {
    cancelled_by?: {
        id: number;
        name: string;
    } | null;
}

export default function Show({ transfer, can }: ShowPageProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [isReceiving, setIsReceiving] = useState(false);
    const [showRejectAll, setShowRejectAll] = useState(false);

    // Cast transfer to include the cancelled_by property
    const transferData = transfer as ExtendedTransfer;

    // Check if user is owner or admin (full access)
    const isOwnerOrAdmin = auth.user.role === 'owner' || auth.user.is_admin;
    const isSourceUser = auth.user.employee?.branch_id === transfer.source_branch.id;
    const isDestUser = auth.user.employee?.branch_id === transfer.destination_branch.id;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Transfers', href: route('inventory.transfers.index') },
        { title: `Transfer #${transfer.id}`, href: route('inventory.transfers.show', transfer.id) },
    ];

    // Form for cancel transfer
    const cancelForm = useForm({});

    // Form for reject transfer
    const rejectForm = useForm({
        rejection_reason: '',
        items: transfer.items.map(item => ({
            id: item.id,
            reception_status: 'rejected',
            received_quantity: 0,
            reception_notes: ''
        })),
        reject_all: true
    });

    const handleCancelSubmit = () => {
        cancelForm.post(route('inventory.transfers.cancel', transfer.id), {
            onSuccess: () => {
                toast.success('Transfer successfully cancelled.');
            },
            onError: () => {
                toast.error('Failed to cancel transfer. It may have already been processed.');
            },
        });
    };

    const handleRejectSubmit = () => {
        rejectForm.post(route('inventory.transfers.reject', transfer.id), {
            onSuccess: () => {
                toast.success(`Transfer #${transfer.id} rejected successfully.`);
                setShowRejectAll(false);
            },
            onError: () => {
                toast.error('An error occurred while rejecting the transfer.');
            }
        });
    };

    // Calculate date formatting
    const formattedReceivedDate = transfer.received_at
        ? format(new Date(transfer.received_at), 'MMM dd, yyyy p')
        : 'Pending';

    const InfoField = ({ label, value, badge }: { label: string; value: string | null; badge?: React.ReactNode }) => (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
                <p className="font-medium">{value || 'N/A'}</p>
                {badge}
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Transfer #${transfer.id}`} />

            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <Heading title={`Transfer #${transfer.id}`} description="Details of the stock transfer." />
                    <div className="self-start sm:self-auto">
                        <StatusBadge
                            status={transfer.status}
                            isSourceUser={isSourceUser}
                            isDestUser={isDestUser}
                        />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <CardTitle>Transfer Details</CardTitle>
                            {transfer.status === 'pending' && (
                                <Badge variant="outline" className="self-start sm:self-auto bg-amber-50 text-amber-800 border-amber-200">
                                    {isDestUser ? "Awaiting your reception" : "Awaiting reception"}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InfoField
                            label="Source Branch"
                            value={transfer.source_branch.name}
                            badge={isSourceUser && !isOwnerOrAdmin && <Badge variant="outline" className="text-xs">You</Badge>}
                        />
                        <InfoField
                            label="Destination Branch"
                            value={transfer.destination_branch.name}
                            badge={isDestUser && !isOwnerOrAdmin && <Badge variant="outline" className="text-xs">You</Badge>}
                        />
                        <InfoField label="Sent By" value={transfer.sending_user.name} />
                        <InfoField label="Date Sent" value={format(new Date(transfer.sent_at), 'MMM dd, yyyy p')} />

                        {transfer.status === 'cancelled' ? (
                            <>
                                <InfoField
                                    label="Cancelled By"
                                    value={transfer.receiving_user?.name ?? 'System'}
                                />
                                <InfoField
                                    label="Date Cancelled"
                                    value={transfer.received_at ? format(new Date(transfer.received_at), 'MMM dd, yyyy p') : 'N/A'}
                                />
                            </>
                        ) : transfer.status === 'rejected' ? (
                            <>
                                <InfoField
                                    label="Rejected By"
                                    value={transfer.receiving_user?.name ?? 'System'}
                                />
                                <InfoField
                                    label="Date Rejected"
                                    value={transfer.received_at ? format(new Date(transfer.received_at), 'MMM dd, yyyy p') : 'N/A'}
                                />
                            </>
                        ) : (
                            <>
                                <InfoField
                                    label="Received By"
                                    value={transfer.receiving_user?.name ?? 'Pending'}
                                />
                                <InfoField
                                    label="Date Received"
                                    value={formattedReceivedDate}
                                    badge={!transfer.received_at && transfer.status === 'pending' && (
                                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                            Pending
                                        </Badge>
                                    )}
                                />
                            </>
                        )}

                        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                            <p className="text-sm font-medium text-muted-foreground">Notes</p>
                            <p className="text-sm whitespace-pre-wrap">{transfer.notes || 'No notes provided.'}</p>
                        </div>
                    </CardContent>
                    {transfer.status === 'pending' && (
                        <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-6">
                            {/* Cancel button - visible to source branch users and owners/admins */}
                            {(isSourceUser || isOwnerOrAdmin) && can.cancel && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={cancelForm.processing} className="w-full sm:w-auto">
                                            {cancelForm.processing ? (
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Ban className="mr-2 h-4 w-4" />
                                            )}
                                            Cancel Transfer
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will cancel the transfer and return all stock to the source branch's inventory. This
                                                action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                            <AlertDialogCancel className="mt-0">Back</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleCancelSubmit}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Yes, Cancel Transfer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {/* Receive button - visible to destination branch users and owners/admins */}
                            {(isDestUser || isOwnerOrAdmin) && can.update && (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowRejectAll(true)}
                                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 w-full sm:w-auto"
                                    >
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Reject Transfer
                                    </Button>

                                    <Button asChild variant="default" className="w-full sm:w-auto">
    <Link href={route('inventory.transfers.receive', transfer.id)}>
        <PackageCheck className="mr-2 h-4 w-4" />
        Receive Items
    </Link>
</Button>

                                </div>
                            )}
                        </CardFooter>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transferred Items</CardTitle>
                        <CardDescription>A complete list of items included in this transfer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Batch #</TableHead>
                                        <TableHead>Portion/Batch Label</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        {transfer.status !== 'pending' && <TableHead>Status</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfer.items.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <TableRow>
                                                <TableCell>{item.inventory_item.name}</TableCell>
                                                <TableCell>#{item.inventory_batch.batch_number}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {item.inventory_batch_portion?.label || item.inventory_batch.label}
                                                </TableCell>
                                                <TableCell>{`${item.quantity} ${item.inventory_item.unit}`}</TableCell>
                                                {transfer.status !== 'pending' && (
                                                    <TableCell>
                                                        {item.reception_status === 'received' ? (
                                                            <Badge variant="success">Received</Badge>
                                                        ) : item.reception_status === 'rejected' ? (
                                                            <Badge variant="destructive">Rejected</Badge>
                                                        ) : (
                                                            <Badge variant="outline">N/A</Badge>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                            {item.reception_notes && (
                                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                    <TableCell colSpan={5} className="py-2 px-5 text-xs">
                                                        <span className="font-semibold text-muted-foreground">Notes:</span> {item.reception_notes}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4">
                            {transfer.items.map((item) => (
                                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                                    <h4 className="font-medium">{item.inventory_item.name}</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Batch</p>
                                            <p className="font-medium">#{item.inventory_batch.batch_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Portion/Batch</p>
                                            <p className="font-mono text-xs font-medium">
                                                {item.inventory_batch_portion?.label || item.inventory_batch.label}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">Quantity</p>
                                            <p className="font-medium">{`${item.quantity} ${item.inventory_item.unit}`}</p>
                                        </div>
                                        {transfer.status !== 'pending' && (
                                            <div className="col-span-2">
                                                <p className="text-muted-foreground">Status</p>
                                                {item.reception_status === 'received' ? (
                                                    <Badge variant="success">Received</Badge>
                                                ) : item.reception_status === 'rejected' ? (
                                                    <Badge variant="destructive">Rejected</Badge>
                                                ) : (
                                                    <Badge variant="outline">N/A</Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {item.reception_notes && (
                                        <div className="text-xs border-t pt-2">
                                            <span className="font-semibold text-muted-foreground">Notes:</span> {item.reception_notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transfer Reception Form */}


            {/* Reject Transfer Dialog */}
            <Dialog open={showRejectAll} onOpenChange={setShowRejectAll}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Transfer #{transfer.id}</DialogTitle>
                        <DialogDescription>
                            This will reject the entire transfer and return all stock to the source branch.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>You're rejecting this entire transfer</AlertTitle>
                        <AlertDescription>
                            All items will be marked as rejected and the inventory will be returned to the source branch.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="rejection_reason">Rejection Reason (Required)</Label>
                        <Textarea
                            id="rejection_reason"
                            value={rejectForm.data.rejection_reason}
                            onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                            placeholder="Please provide a reason for rejecting this transfer..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectAll(false)}
                            disabled={rejectForm.processing}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={rejectForm.processing || !rejectForm.data.rejection_reason}
                            className="w-full sm:w-auto"
                        >
                            {rejectForm.processing ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Ban className="mr-2 h-4 w-4" />
                            )}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
