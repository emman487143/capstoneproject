import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface LogDetailProps {
    details: {
        quantityInfo?: string;
        description?: string;
        metadata?: Array<{ label: string; value: string | number }>;
    };
}

export default function LogDetail({ details }: LogDetailProps) {
    if (!details) {
        return <div className="text-sm text-muted-foreground">No details available.</div>;
    }

    const { quantityInfo, description, metadata = [] } = details;
    const isPositive = quantityInfo?.includes('↑');
    const isNegative = quantityInfo?.includes('↓');

    return (
        <div className="space-y-1.5">
            {quantityInfo && (
                <div
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold',
                        isPositive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : isNegative
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                    )}
                >
                    {isPositive && <ArrowUp className="h-3.5 w-3.5" />}
                    {isNegative && <ArrowDown className="h-3.5 w-3.5" />}
                    <span>{quantityInfo.replace(/[↑↓]/g, '').trim()}</span>
                </div>
            )}

            {description && <p className="text-sm text-foreground">{description}</p>}

            {metadata.length > 0 && (
                <div className="space-y-1 border-l-2 border-border/60 pl-3 pt-1 text-xs">
                    {metadata.map((item, index) => (
                        <div key={index} className="flex items-start  gap-4">
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="text-right font-medium text-foreground">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
