import { Badge } from '@/components/ui/badge';
import { TransferStatus } from '@/types';
import { clsx } from 'clsx';
import { CheckCircle2, Clock, X, Ban } from 'lucide-react';

interface Props {
    status: TransferStatus;
    isSourceUser?: boolean;
    isDestUser?: boolean;
    size?: 'default' | 'sm' | 'lg';
}
const statusStyles: Record<TransferStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
    completed: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
    cancelled: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
    rejected: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800',
};

// Add icon for rejected status
const statusIcons = {
    pending: <Clock className="h-3.5 w-3.5 mr-1" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 mr-1" />,
    cancelled: <X className="h-3.5 w-3.5 mr-1" />,
    rejected: <Ban className="h-3.5 w-3.5 mr-1" />
};

// Update getStatusText
const getStatusText = (status: TransferStatus, isSourceUser?: boolean, isDestUser?: boolean): string => {
    if (status === 'pending') {
        if (isDestUser) return 'Awaiting Reception';
        if (isSourceUser) return 'Sent, Awaiting Reception';
        return 'Pending';
    }

    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'rejected') return 'Rejected';

    return status;
};

export default function StatusBadge({ status, isSourceUser, isDestUser, size = 'default' }: Props) {
    const displayText = getStatusText(status, isSourceUser, isDestUser);

    return (
        <Badge
            className={clsx(
                'flex items-center',
                statusStyles[status],
                size === 'sm' && 'text-xs py-0 px-2 h-5'
            )}
        >
            {statusIcons[status]}
            <span>{displayText}</span>
        </Badge>
    );
}
