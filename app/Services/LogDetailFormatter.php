<?php

namespace App\Services;

use App\Enums\Inventory\LogAction;
use App\Models\InventoryLog;
use App\Models\Sale;
use Illuminate\Support\Facades\Log;

class LogDetailFormatter
{
    /**
     * Format the details of an inventory log entry for display.
     *
     * @param InventoryLog $log
     * @return array
     */
    public function format(InventoryLog $log): array
    {
        // CRITICAL FIX: Ensure proper JSON decoding by handling all scenarios
        $rawDetails = $log->details;
        $details = null;

        if (is_string($rawDetails)) {
            try {
                $details = json_decode($rawDetails, true);
            } catch (\Throwable $e) {
                Log::error('Error decoding log details JSON: ' . $e->getMessage(), [
                    'log_id' => $log->id,
                    'raw_details' => $rawDetails
                ]);
                $details = [];
            }
        } elseif (is_array($rawDetails)) {
            $details = $rawDetails;
        } else {
            $details = [];
        }

        // Base structure for formatted details
        $formatted = [
            'title' => '',
            'description' => '',
            'quantityInfo' => '',
            'reason' => $details['reason'] ?? null,
            'metadata' => [],
            'tracking_type' => null, // Add this line to store tracking type
        ];

        // Load necessary relationships if not already loaded
        if (!$log->relationLoaded('batch') && $log->inventory_batch_id) {
            $log->load('batch.inventoryItem');
        }
        if (!$log->relationLoaded('portion') && $log->batch_portion_id) {
            $log->load('portion.batch.inventoryItem');
        }

        // Get item info regardless of where it comes from
        $item = $log->batch->inventoryItem ?? $log->portion->batch->inventoryItem ?? null;
        $itemName = $item?->name ?? 'Unknown Item';
        $itemUnit = $details['unit'] ?? $item?->unit ?? 'unit(s)';

        // Add tracking type to formatted details
        $formatted['tracking_type'] = $item?->tracking_type ?? null;

        switch ($log->action) {
            case LogAction::ADJUSTMENT_WASTE->value:
            case LogAction::ADJUSTMENT_SPOILAGE->value:
            case LogAction::ADJUSTMENT_THEFT->value:
            case LogAction::ADJUSTMENT_OTHER->value:
                // Handle all adjustments consistently
                $this->formatDetailedAdjustment($formatted, $log, $itemName, $itemUnit, $details);
                break;

            case LogAction::BATCH_CREATED->value:
                $formatted['title'] = 'Batch Created';
                $quantity = $details['quantity_received'] ?? $log->batch?->quantity_received ?? 'Unknown';
                $formatted['description'] = "{$quantity} {$itemUnit} of {$itemName}";
                $formatted['quantityInfo'] = "+{$quantity} {$itemUnit}";

                // Add batch details
                if ($log->batch) {
                    $formatted['metadata'][] = [
                        'label' => 'Batch #',
                        'value' => $log->batch->batch_number
                    ];

                    if ($log->batch->source) {
                        $formatted['metadata'][] = [
                            'label' => 'Source',
                            'value' => $log->batch->source
                        ];
                    }

                    if ($log->batch->expiration_date) {
                        $formatted['metadata'][] = [
                            'label' => 'Expiration',
                            'value' => $log->batch->expiration_date->format('M d, Y')
                        ];
                    }
                }
                break;

            case LogAction::DEDUCTED_FOR_SALE->value:
                // Get product info if available
                $productName = $details['product_name'] ?? null;
                $saleId = $log->sale_id ?? $details['sale_id'] ?? null;

                // Check if this is a portion or measure tracked item
                if ($log->portion) {
                    // Portion-based item (already works)
                    $description = "Deducted For Sale for portion ";
                    if ($log->portion?->label) {
                        $description .= $log->portion->label;

                        $formatted['metadata'][] = [
                            'label' => 'Portion',
                            'value' => $log->portion->label
                        ];
                    } else {
                        $description .= "of {$itemName}";
                    }
                    $formatted['quantityInfo'] = "-1 {$itemUnit}";
                } else {
                    // Measure-based item - check multiple possible keys for quantity
                    $qtyDeducted = $details['quantity_deducted'] ?? $details['quantity'] ?? $details['quantity_change'] ?? null;

                    // Make sure we have a quantity to display
                    if ($qtyDeducted) {
                        $description = "{$qtyDeducted} {$itemUnit} of {$itemName}";
                        $formatted['quantityInfo'] = "-{$qtyDeducted} {$itemUnit}";
                        $formatted['has_quantity'] = true;
                    } else {
                        $description = "{$itemName}";
                        $formatted['has_quantity'] = false;
                    }

                    // Add batch number as metadata
                    if ($log->batch) {
                        $formatted['metadata'][] = [
                            'label' => 'Batch',
                            'value' => "#{$log->batch->batch_number}"
                        ];
                    }
                }

                // Add sale reference if available
                if ($saleId) {
                    $description .= " for Sale #{$saleId}";
                }

                // Add product information if available
                if ($productName) {
                    $description .= " ({$productName})";
                }

                $formatted['description'] = $description;
                break;

            case LogAction::TRANSFER_INITIATED->value:
                $formatted['title'] = 'Transfer Initiated';

                // Source and destination
                $sourceBranch = $details['source_branch'] ?? $log->batch?->branch?->name ?? 'Unknown Branch';
                $destBranch = $details['destination_branch'] ?? 'Another Branch';
                $formatted['description'] = "From {$sourceBranch} to {$destBranch}";

                // Transfer ID and item count
                $transferId = $details['transfer_id'] ?? null;
                if ($transferId) {
                    $formatted['metadata'][] = [
                        'label' => 'Transfer #',
                        'value' => $transferId
                    ];
                }

                // Items count
                $items = $details['items'] ?? [];
                $itemCount = is_array($items) ? count($items) : 1;
                $formatted['quantityInfo'] = "{$itemCount} " . ($itemCount == 1 ? 'item' : 'items');
                break;

            case LogAction::TRANSFER_RECEIVED->value:
                $formatted['title'] = 'Transfer Received';

                // Source and destination
                $sourceBranch = $details['source_branch'] ?? 'Another Branch';
                $destBranch = $details['destination_branch'] ?? $log->batch?->branch?->name ?? 'Current Branch';
                $formatted['description'] = "From {$sourceBranch} to {$destBranch}";

                // Transfer ID
                $transferId = $details['transfer_id'] ?? null;
                if ($transferId) {
                    $formatted['metadata'][] = [
                        'label' => 'Transfer #',
                        'value' => $transferId
                    ];
                }

                // Quantity received
                $qtyChange = $details['quantity_change'] ?? '1';
                $formatted['quantityInfo'] = "+{$qtyChange} {$itemUnit}";
                break;

            case LogAction::TRANSFER_CANCELLED->value:
                $formatted['title'] = 'Transfer Cancelled';

                $transferId = $details['transfer_id'] ?? null;
                $formatted['description'] = $transferId ? "Transfer #{$transferId} cancelled" : "Transfer cancelled";

                // Returned quantity
                $qtyChange = $details['quantity_change'] ?? null;
                if ($qtyChange) {
                    $formatted['quantityInfo'] = "+{$qtyChange} {$itemUnit} returned";
                }

                // Additional notes
                $notes = $details['notes'] ?? null;
                if ($notes) {
                    $formatted['metadata'][] = [
                        'label' => 'Notes',
                        'value' => $notes
                    ];
                }
                break;

            case LogAction::BATCH_COUNT_CORRECTED->value:
                $formatted['title'] = 'Count Corrected';

                // Quantity change
                $oldQty = $details['old_quantity'] ?? null;
                $newQty = $details['new_quantity'] ?? null;

                if ($oldQty !== null && $newQty !== null) {
                    $formatted['description'] = "Updated from {$oldQty} to {$newQty} {$itemUnit}";
                    $diff = $newQty - $oldQty;
                    $sign = $diff >= 0 ? '+' : '';
                    $formatted['quantityInfo'] = "{$sign}{$diff} {$itemUnit}";
                } else {
                    $formatted['description'] = "Count manually adjusted";
                }
                break;

            case LogAction::PORTION_RESTORED->value:
                $formatted['title'] = 'Portion Restored';

                if ($log->portion) {
                    $formatted['description'] = "Restored portion {$log->portion->label}";
                }

                $originalAdjustment = $details['original_adjustment'] ?? null;
                if ($originalAdjustment) {
                    $originalAction = $originalAdjustment['action'] ?? 'Unknown';
                    $originalReason = $originalAdjustment['reason'] ?? 'Unknown';

                    $formatted['metadata'][] = [
                        'label' => 'Original Issue',
                        'value' => $this->formatActionName($originalAction)
                    ];

                    $formatted['metadata'][] = [
                        'label' => 'Original Reason',
                        'value' => $originalReason
                    ];
                }

                $formatted['quantityInfo'] = "+1 {$itemUnit}";
                break;

            default:
                $formatted['title'] = $this->formatActionName($log->action);
                $formatted['description'] = $this->generateFallbackDescription($log, $itemName);
        }

        return $formatted;
    }

/**
 * Format detailed adjustment information with comprehensive before/after quantities
 *
 * @param array &$formatted The formatted output array
 * @param InventoryLog $log The log entry
 * @param string $itemName The item name
 * @param string $itemUnit The item unit
 * @param array $details The details from the log
 * @return void
 */
private function formatDetailedAdjustment(array &$formatted, InventoryLog $log, string $itemName, string $itemUnit, array $details): void
{
    // Extract action type for display
    $actionString = is_object($log->action) ? $log->action->value : $log->action;
    $actionType = str_replace('adjustment_', '', $actionString);

    // Get batch info
    $batchInfo = $log->batch ? "(Batch #{$log->batch->batch_number})" : '';

    // CRITICAL FIX: For portion-based adjustments (like spoilage adjustments)
    if ($log->portion || isset($details['portion_label'])) {
        $portionLabel = $log->portion?->label ?? $details['portion_label'] ?? null;

        if ($portionLabel) {
            // For portion logs, always show the quantity as 1 since that's the standard unit
            $formatted['quantityInfo'] = "-1 {$itemUnit}";
            $formatted['has_quantity'] = true;

            // Include portion identifier in description
            if (!isset($formatted['description']) || empty($formatted['description'])) {
                $formatted['description'] = "Adjustment of portion {$portionLabel}";
            }

            // Add portion details to metadata for better visibility
            $formatted['metadata'][] = [
                'label' => 'Portion',
                'value' => $portionLabel
            ];
        }

        // Extract and display reason explicitly
        if (isset($details['reason'])) {
            $formatted['reason'] = $details['reason'];
        }

        return; // Exit early as we've handled the portion case
    }

    // For measure-tracked items, extract quantity information
    $qty = null;
    $direction = '-'; // Default to decrease for adjustments

    // Check all possible quantity fields
    if (isset($details['quantity_adjusted']) && ($details['quantity_adjusted'] !== null)) {
        $qty = (float)$details['quantity_adjusted'];
        $direction = ($details['adjustment_direction'] ?? 'decrease') === 'increase' ? '+' : '-';
    }
    elseif (isset($details['original_quantity']) && isset($details['new_quantity'])) {
        $originalQty = (float)$details['original_quantity'];
        $newQty = (float)$details['new_quantity'];
        $qty = abs($newQty - $originalQty);
        $direction = $newQty > $originalQty ? '+' : '-';
    }
    elseif (isset($details['quantity_change'])) {
        $qty = abs((float)$details['quantity_change']);
        $direction = (isset($details['change_direction']) && $details['change_direction'] === 'positive') ? '+' : '-';
    }

    if ($qty !== null) {
        // Format for prominent quantity display
        $formatted['quantityInfo'] = $direction . (string)$qty . ' ' . $itemUnit;
        $formatted['has_quantity'] = true;

        $formatted['description'] = $qty . ' ' . $itemUnit . ' of ' . $itemName . ' ' . $batchInfo;

        // Add before/after quantities as metadata
        if (isset($details['original_quantity']) && isset($details['new_quantity'])) {
            $formatted['metadata'][] = [
                'label' => 'Before',
                'value' => $details['original_quantity'] . ' ' . $itemUnit
            ];

            $formatted['metadata'][] = [
                'label' => 'After',
                'value' => $details['new_quantity'] . ' ' . $itemUnit
            ];
        }
    } else {
        // Handle the case where we don't have quantity info
        $formatted['description'] = "{$itemName} {$batchInfo}";
        $formatted['has_quantity'] = false;
    }

    // Extract reason information - prioritize explicit reason field
    $reason = $details['reason'] ?? $details['notes'] ?? $details['description'] ?? null;
    if ($reason && strtolower($reason) !== strtolower($actionType)) {
        $formatted['reason'] = $reason;
    }
}

    /**
     * Generate a fallback description for logs with minimal information
     *
     * @param InventoryLog $log
     * @param string $itemName
     * @return string
     */
    private function generateFallbackDescription(InventoryLog $log, string $itemName): string
    {
        $action = $this->formatActionName($log->action);

        // For portion-specific logs
        if ($log->portion) {
            return "{$action} for portion {$log->portion->label}";
        }

        // For batch-specific logs
        if ($log->batch) {
            return "{$action} for {$itemName} (Batch #{$log->batch->batch_number})";
        }

        // Generic fallback
        return "{$action} for {$itemName}";
    }

    /**
     * Format action name for display by converting snake_case to Title Case.
     * Handles both string values and LogAction enum instances.
     *
     * @param string|LogAction $action
     * @return string
     */
    private function formatActionName(string|LogAction $action): string
    {
        // Convert enum to string value if needed
        $actionString = is_object($action) ? $action->value : $action;

        return ucwords(str_replace('_', ' ', $actionString));
    }
}
