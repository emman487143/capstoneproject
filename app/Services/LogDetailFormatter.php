<?php

namespace App\Services;

use App\Enums\Inventory\LogAction;
use App\Models\InventoryLog;
use Illuminate\Support\Str;

class LogDetailFormatter
{
    public function format(InventoryLog $log): array
    {
        $details = $log->details ?? [];
        $item = $log->batch?->inventoryItem ?? $log->portion?->batch?->inventoryItem;
        $itemUnit = $item?->unit ?? 'units';

        $base = [
            'quantityInfo' => '',
            'description' => '',
            'metadata' => [],
        ];

        return match ($log->action) {
            LogAction::DEDUCTED_FOR_SALE => $this->formatDeductedForSale($log, $details, $itemUnit, $base),
            LogAction::BATCH_CREATED => $this->formatBatchCreated($log, $details, $itemUnit, $base),
            LogAction::BATCH_COUNT_CORRECTED => $this->formatBatchCountCorrected($log, $details, $itemUnit, $base),
            LogAction::TRANSFER_INITIATED, LogAction::TRANSFER_RECEIVED, LogAction::TRANSFER_CANCELLED, LogAction::TRANSFER_REJECTED => $this->formatTransfer($log, $details, $itemUnit, $base),
            LogAction::PORTION_RESTORED, LogAction::QUANTITY_RESTORED => $this->formatRestoration($log, $details, $itemUnit, $base),
            default => $this->formatAdjustment($log, $details, $itemUnit, $base),
        };
    }

    private function addMetadata(array &$base, string $label, ?string $value): void
    {
        if ($value !== null && $value !== '') {
            $base['metadata'][] = ['label' => $label, 'value' => $value];
        }
    }

    private function formatDeductedForSale(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        if ($log->portion) {
            $base['quantityInfo'] = '↓ -1 portion';
        } else {
            $qty = $details['quantity_deducted'] ?? $details['quantity'] ?? 0;
            $base['quantityInfo'] = sprintf('↓ -%s %s', number_format((float)$qty, 2), $itemUnit);
            // REMOVED: The batch label is already shown in the 'Item' column.
        }

        $base['description'] = isset($details['product_name']) ? "Used in {$details['product_name']}" : 'Used in sale';
        $this->addMetadata($base, 'Sale ID', $log->sale_id ? "#S-{$log->sale_id}" : null);

        return $base;
    }

    private function formatAdjustment(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        $actionName = Str::of($log->action->value)->replace('adjustment_', '')->replace('_', ' ')->__toString();
        $base['description'] = "Marked as {$actionName}";

        if ($log->portion) {
            $base['quantityInfo'] = '↓ -1 portion';
            // REMOVED: The portion label is already shown in the 'Item' column.
        } else {
            $qty = $details['quantity_change'] ?? 0;
            $base['quantityInfo'] = sprintf('↓ -%s %s', number_format(abs((float)$qty), 2), $itemUnit);
            $this->addMetadata($base, 'Before', isset($details['old_quantity']) ? "{$details['old_quantity']} {$itemUnit}" : null);
            $this->addMetadata($base, 'After', isset($details['new_quantity']) ? "{$details['new_quantity']} {$itemUnit}" : null);
        }

        $this->addMetadata($base, 'Reason', $details['reason'] ?? null);
        if ($log->action === LogAction::ADJUSTMENT_EXPIRED) {
            $this->addMetadata($base, 'Expiration Date', $log->batch?->expiration_date?->format('M d, Y'));
        }

        return $base;
    }

    private function formatTransfer(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        // CORRECTED: Always use the absolute float value of the quantity.
        // The direction (positive/negative) is determined by the log action itself.
        $qty = abs((float)($details['quantity_change'] ?? 1));
        $transferId = $details['transfer_id'] ?? null;

        // Format the quantity differently for portions vs. measures for clarity.
        $formattedQty = $log->portion ? $qty : number_format($qty, 2);
        $unit = $log->portion ? 'portion' : $itemUnit;


        switch ($log->action) {
            case LogAction::TRANSFER_INITIATED:
                $base['quantityInfo'] = sprintf('↓ -%s %s', $formattedQty, $unit);
                $base['description'] = 'Transferred to ' . ($details['destination_branch_name'] ?? 'another branch');
                break;
            case LogAction::TRANSFER_RECEIVED:
                $base['quantityInfo'] = sprintf('↑ +%s %s', $formattedQty, $unit);
                $newBatchLabel = $log->batch?->label ? "as {$log->batch->label}" : '';
                $base['description'] = "Stock received and re-batched {$newBatchLabel} at destination.";
                $this->addMetadata($base, 'Reception Notes', $details['notes'] ?? null);
                // REMOVED: The new batch label is already shown in the 'Item' column for this log entry.
                break;
            case LogAction::TRANSFER_CANCELLED:
                $base['quantityInfo'] = sprintf('↑ +%s %s', $formattedQty, $unit);
                $subject = $log->portion ? 'Portion' : 'Quantity';
                $base['description'] = "{$subject} returned to stock after transfer cancellation.";
                $this->addMetadata($base, 'Reason', 'Transfer cancelled by sender');
                break;
            case LogAction::TRANSFER_REJECTED:
                $base['quantityInfo'] = sprintf('↑ +%s %s', $formattedQty, $unit);
                $subject = $log->portion ? 'Portion' : 'Quantity';
                $base['description'] = "{$subject} returned to stock after rejection.";
                $this->addMetadata($base, 'Rejection Reason', $details['notes'] ?? 'Item rejected by receiver');
                break;
        }

        $this->addMetadata($base, 'Transfer ID', $transferId ? "#T-{$transferId}" : null);
        return $base;
    }

    private function formatBatchCreated(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        $qty = $details['quantity_received'] ?? 0;
        $base['quantityInfo'] = sprintf('↑ +%s %s', number_format((float)$qty, 2), $itemUnit);
        $base['description'] = 'Received new stock';
        $this->addMetadata($base, 'Source', $log->batch?->source);
        $this->addMetadata($base, 'Expires', $log->batch?->expiration_date?->format('M d, Y'));
        return $base;
    }

    private function formatBatchCountCorrected(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        $oldQty = $details['old_quantity'] ?? 0;
        $newQty = $details['new_quantity'] ?? 0;
        $diff = (float)$newQty - (float)$oldQty;
        $sign = $diff >= 0 ? '↑ +' : '↓ ';
        $base['quantityInfo'] = sprintf('%s%s %s', $sign, number_format(abs($diff), 2), $itemUnit);
        $base['description'] = 'Manual count correction';
        $this->addMetadata($base, 'Reason', $details['reason'] ?? null);
        $this->addMetadata($base, 'Before', "{$oldQty} {$itemUnit}");
        $this->addMetadata($base, 'After', "{$newQty} {$itemUnit}");
        return $base;
    }

    private function formatRestoration(InventoryLog $log, array $details, string $itemUnit, array $base): array
    {
        if ($log->action === LogAction::PORTION_RESTORED) {
            $base['quantityInfo'] = '↑ +1 portion';
            $base['description'] = 'Restored to inventory';
            // REMOVED: The portion label is already shown in the 'Item' column.
            $originalStatus = $details['original_adjustment']['action'] ?? null;
            if ($originalStatus) {
                $this->addMetadata($base, 'Original Status', Str::of($originalStatus)->replace('adjustment_', '')->title()->__toString());
            }
        } else { // QUANTITY_RESTORED
            $qty = $details['quantity_restored'] ?? 0;
            $base['quantityInfo'] = sprintf('↑ +%s %s', number_format((float)$qty, 2), $itemUnit);
            $base['description'] = 'Quantity restored to batch';
            // REMOVED: The batch label is already shown in the 'Item' column.
            $this->addMetadata($base, 'Before', isset($details['before_quantity']) ? "{$details['before_quantity']} {$itemUnit}" : null);
            $this->addMetadata($base, 'After', isset($details['after_quantity']) ? "{$details['after_quantity']} {$itemUnit}" : null);
        }
        $this->addMetadata($base, 'Restoration Reason', $details['restoration_reason'] ?? $details['reason'] ?? null);
        return $base;
    }
}
