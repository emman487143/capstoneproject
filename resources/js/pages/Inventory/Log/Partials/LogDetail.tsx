import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowDown, ArrowUp, Info } from 'lucide-react';

interface LogDetailProps {
    action: string;
    details: {
        title?: string;
        description?: string;
        quantityInfo?: string;
        reason?: string;
        metadata?: Array<{ label: string; value: string }>;
        tracking_type?: string;
        has_quantity?: boolean;
    };
    rawDetails?: Record<string, any>;
}

export default function LogDetail({ action, details, rawDetails }: LogDetailProps) {
    if (!details) {
        return <div className="text-muted-foreground text-sm">No details available</div>;
    }

    const {
        description = '',
        quantityInfo = '',
        reason = '',
        metadata = [],
        has_quantity = false
    } = details;

    // Extract action type for consistent display
    const isAdjustment = action.includes('adjustment');
    const adjustmentType = isAdjustment ? action.replace('adjustment_', '') : '';

    // Check if this is a portion log by examining the metadata or description
    const portionMatch = description.match(/for portion|of portion|portion ([A-Z0-9-]+)/i);
    const hasPortion = !!portionMatch || metadata.some(item => item.label === 'Portion');
    const portionInfo = metadata.find(item => item.label === 'Portion');

    // Get quantity information from rawDetails if formatted details don't have it
    let effectiveQuantityInfo = quantityInfo;

    // If we don't have quantity info in the formatted details but do have raw details
    if (!effectiveQuantityInfo && rawDetails) {
        if (isAdjustment) {
            // Extract quantity info from raw details
            if (rawDetails.quantity_adjusted) {
                const unit = rawDetails.unit || '';
                const direction = (rawDetails.adjustment_direction === 'increase') ? '+' : '-';
                effectiveQuantityInfo = `${direction}${rawDetails.quantity_adjusted} ${unit}`;
            }
            else if (rawDetails.original_quantity && rawDetails.new_quantity) {
                const unit = rawDetails.unit || '';
                const original = parseFloat(rawDetails.original_quantity);
                const newQty = parseFloat(rawDetails.new_quantity);
                const diff = Math.abs(newQty - original);
                const direction = newQty > original ? '+' : '-';
                effectiveQuantityInfo = `${direction}${diff} ${unit}`;
            }
            // For portion-tracked items, default to "-1 portion"
            else if (hasPortion) {
                const unit = rawDetails.unit || 'portion';
                effectiveQuantityInfo = `-1 ${unit}`;
            }
        }
        else if (action === 'batch_created' && rawDetails.quantity_received) {
            const unit = rawDetails.unit || '';
            effectiveQuantityInfo = `+${rawDetails.quantity_received} ${unit}`;
        }
        // Add specific handler for deducted_for_sale
        else if (action === 'deducted_for_sale') {
            // Look for quantity in multiple possible fields
            const qtyDeducted = rawDetails.quantity_deducted ||
                               rawDetails.quantity ||
                               rawDetails.quantity_change;

            if (qtyDeducted) {
                const unit = rawDetails.unit || '';
                effectiveQuantityInfo = `-${qtyDeducted} ${unit}`;
            }
        }
    }

    // For portions, ensure we always show "-1" for adjustments
    if (isAdjustment && hasPortion && !effectiveQuantityInfo) {
        effectiveQuantityInfo = "-1 portion";
    }

    // Determine if we should show the description
    const showDescription = description &&
        !(isAdjustment && hasPortion && description === `Adjustment ${adjustmentType} for portion ${portionInfo?.value}`);

    // Determine if we should show before/after quantities
    const showBeforeAfter = rawDetails && rawDetails.original_quantity && rawDetails.new_quantity;

    // Determine if quantity is positive (addition) or negative (deduction)
    const isPositiveChange = effectiveQuantityInfo && effectiveQuantityInfo.startsWith('+');
    const isNegativeChange = effectiveQuantityInfo && effectiveQuantityInfo.startsWith('-');

    return (
        <div className="space-y-2">
            {/* Main quantity change - displayed prominently */}
            {effectiveQuantityInfo && (
                <div className={cn(
                    "text-sm font-bold rounded-md inline-flex items-center gap-1 px-3 py-1",
                    isPositiveChange ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    isNegativeChange ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                )}>
                    {isPositiveChange && <ArrowUp className="h-3 w-3" />}
                    {isNegativeChange && <ArrowDown className="h-3 w-3" />}
                    {effectiveQuantityInfo}
                </div>
            )}

            {/* Missing quantity warning */}
            {!effectiveQuantityInfo && isAdjustment && !has_quantity && !hasPortion && (
                <div className="text-amber-500 dark:text-amber-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Missing quantity</span>
                </div>
            )}

            {/* Portion info - if applicable */}
            {portionInfo && (
                <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                    {portionInfo.value}
                </div>
            )}

            {/* Description - if it adds value */}
            {showDescription && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Reason (only shown if not redundant with adjustment type) */}
            {reason && reason.toLowerCase() !== adjustmentType.toLowerCase() && (
                <div className="text-sm">
                    <span className="text-muted-foreground font-medium">Reason: </span>
                    <span>{reason}</span>
                </div>
            )}
            {/* If no formatted reason but rawDetails has a reason */}
            {!reason && rawDetails?.reason && rawDetails.reason.toLowerCase() !== adjustmentType.toLowerCase() && (
                <div className="text-sm">
                    <span className="text-muted-foreground font-medium">Reason: </span>
                    <span>{rawDetails.reason}</span>
                </div>
            )}

            {/* Before/After quantities in a compact layout */}
            {showBeforeAfter && (
                <div className="grid grid-cols-2 gap-2 text-xs mt-1.5 pt-1.5 border-t border-border/40">
                    <div>
                        <span className="text-muted-foreground">Before: </span>
                        <span className="font-medium">{rawDetails.original_quantity} {rawDetails.unit || ''}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">After: </span>
                        <span className="font-medium">{rawDetails.new_quantity} {rawDetails.unit || ''}</span>
                    </div>
                </div>
            )}

            {/* Additional metadata in a compact layout */}
            {metadata && metadata.length > 0 && metadata.some(item => item.label !== 'Portion') && (
                <div className={cn(
                    "grid grid-cols-1 gap-1 text-xs",
                    showBeforeAfter ? "" : "mt-1.5 pt-1.5 border-t border-border/40"
                )}>
                    {metadata
                        .filter(item => item.label !== 'Portion') // Don't repeat portion info
                        .map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{item.label}:</span>
                                <span className="font-medium">{item.value}</span>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
