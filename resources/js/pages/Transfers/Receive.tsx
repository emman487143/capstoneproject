import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { BreadcrumbItem, Transfer } from '@/types';
import Heading from '@/components/heading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatusBadge from './Partials/StatusBadge';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import TransferReceptionForm from './Partials/TransferReceptionForm';

interface ReceivePageProps {
    transfer: Transfer;
    can: {
        update: boolean;
        cancel: boolean;
    };
}

export default function Receive({ transfer, can }: ReceivePageProps) {
    const { auth } = usePage().props as any;

    const isOwnerOrAdmin = auth.user.role === 'owner' || auth.user.is_admin;
    const isSourceUser = auth.user.employee?.branch_id === transfer.source_branch.id;
    const isDestUser = auth.user.employee?.branch_id === transfer.destination_branch.id;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Transfers', href: route('inventory.transfers.index') },
        { title: `Transfer #${transfer.id}`, href: route('inventory.transfers.show', transfer.id) },
        { title: 'Receive Items' },
    ];

    // Format date helpers
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
            <Head title={`Receive Transfer #${transfer.id}`} />

            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <Heading title={`Receive Transfer #${transfer.id}`} description="Verify and record the reception of transferred stock." />
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

                        <InfoField
                            label="Received By"
                            value={transfer.receiving_user?.name ?? 'Pending'}
                        />
                        <InfoField
                            label="Date Received"
                            value={formattedReceivedDate}
                            badge={!transfer.received_at && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                    Pending
                                </Badge>
                            )}
                        />

                        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                            <p className="text-sm font-medium text-muted-foreground">Notes</p>
                            <p className="text-sm whitespace-pre-wrap">{transfer.notes || 'No notes provided.'}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Reception Form (supports both by_portion and by_measure) */}
                <TransferReceptionForm transfer={transfer} />

            </div>
        </AppLayout>
    );
}
