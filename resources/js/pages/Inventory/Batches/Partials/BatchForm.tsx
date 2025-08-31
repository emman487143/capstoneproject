import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Branch, InventoryBatch, InventoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

export type BatchFormData = {
    inventory_item_id: string;
    branch_id: string;
    source: string;
    quantity_received: string;
    unit_cost?: string;
    total_cost?: string;
    received_at?: Date;
    expiration_date?: Date;
    action?: 'save' | 'save_and_add_another';
};

interface BatchFormProps {
    data: BatchFormData;
    setData: <K extends keyof BatchFormData>(key: K, value: BatchFormData[K]) => void;
    errors: Partial<Record<keyof BatchFormData, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    inventoryItems: InventoryItem[];
    branches: Branch[];
    selectedItem?: InventoryItem;
    isEditMode?: boolean;
    batch?: InventoryBatch;
    isItemLocked?: boolean;
    isBranchLocked?: boolean;
    children?: React.ReactNode;
}

export function BatchForm({
    data,
    setData,
    errors,
    processing,
    onSubmit,
    inventoryItems,
    branches,
    selectedItem,
    isEditMode = false,
    batch,
    isItemLocked = false,
    isBranchLocked = false,
    children,
}: React.PropsWithChildren<BatchFormProps>) {
    const itemForInfo = isEditMode ? batch?.inventory_item : selectedItem;
    const trackingType = itemForInfo?.tracking_type;
    const itemUnit = itemForInfo?.unit || 'units';

    return (
        <form onSubmit={onSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                    <Label htmlFor='inventory_item_id'>Inventory Item</Label>
                    {/* Always disabled in edit mode */}
                    <Input
                        value={selectedItem?.name || inventoryItems.find(i => String(i.id) === data.inventory_item_id)?.name || 'Loading...'}
                        disabled
                        className='mt-1 block w-full'
                    />
                    <InputError message={errors.inventory_item_id} />
                </div>
                <div>
                    <Label htmlFor='branch_id'>Branch</Label>
                    {/* Always disabled in edit mode */}
                    <Input
                        value={branches.find(b => String(b.id) === data.branch_id)?.name || 'Loading...'}
                        disabled
                        className='mt-1 block w-full'
                    />
                    <InputError message={errors.branch_id} />
                </div>
            </div>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div>
                    <Label htmlFor='quantity_received'>
                        {trackingType === 'by_portion' ? 'Number of Portions' : `Quantity Received (${itemUnit})`}
                    </Label>
                    <Input
                        id='quantity_received'
                        type='number'
                        value={data.quantity_received}
                        onChange={(e) => !isEditMode && setData('quantity_received', e.target.value)}
                        placeholder={trackingType === 'by_portion' ? 'e.g., 12' : 'e.g., 10.5'}
                        disabled={processing || !data.inventory_item_id || isEditMode}
                        step={trackingType === 'by_portion' ? '1' : '0.01'}
                        min='0'
                    />
                    <InputError message={errors.quantity_received} />
                </div>
                {trackingType === 'by_portion' ? (
                    <div>
                        <Label htmlFor="unit_cost">Unit Cost (per {itemUnit})</Label>
                        <Input
                            id="unit_cost"
                            type="number"
                            value={data.unit_cost ?? ''}
                            onChange={(e) => setData('unit_cost', e.target.value)}
                            placeholder="e.g., 150.50"
                            disabled={processing}
                            step="0.01"
                            min="0"
                        />
                        <InputError message={errors.unit_cost} />
                    </div>
                ) : (
                    <div>
                         <Label htmlFor="total_cost" className="required">
                Total Batch Cost
            </Label>
            <Input
                id="total_cost"
                type="number"
                value={data.total_cost ?? ''}
                onChange={(e) => {
                    setData('total_cost', e.target.value);
                    // Auto-calculate unit cost
                    if (e.target.value && data.quantity_received) {
                        const total = parseFloat(e.target.value);
                        const qty = parseFloat(data.quantity_received);
                        if (total > 0 && qty > 0) {
                            setData('unit_cost', (total / qty).toFixed(4));
                        }
                    }
                }}
                placeholder="e.g., 150.50"
                disabled={processing}
                step="0.01"
                min="0"
                required
            />
            <InputError message={errors.total_cost} />


                    </div>
                )}
            </div>


            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>


{selectedItem?.tracking_type === 'by_measure' ? (
    <>
        <div>
           <Label htmlFor="unit_cost">
        Unit Cost (per {itemUnit})
        <span className="text-xs text-muted-foreground ml-1">
            (Auto-calculated)
        </span>
    </Label>

    <Input
        id="unit_cost"
        type="number"
        value={data.unit_cost ?? ''}
        readOnly={selectedItem?.tracking_type === 'by_measure'}
        className={selectedItem?.tracking_type === 'by_measure' ? "bg-muted" : ""}
        onChange={(e) => setData('unit_cost', e.target.value)}
        placeholder="e.g., 0.75"
        disabled={processing}
        step="0.01"
        min="0"
    />
    <InputError message={errors.unit_cost} />
    {selectedItem?.tracking_type === 'by_measure' &&
        <p className="text-xs text-muted-foreground mt-1">
            Unit cost is automatically calculated from total cost ÷ quantity
        </p>
    }
        </div>

    </>
) : null /* Remove cost fields for by_portion items */}



                <div>
                    <Label htmlFor='source'>Source (Optional)</Label>
                    <Input
                        id='source'
                        value={data.source}
                        onChange={(e) => setData('source', e.target.value)}
                        placeholder='e.g., Cabanatuan Market'
                        disabled={processing}
                    />
                    <InputError message={errors.source} />
                </div>
            </div>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>

                <div>
                    <Label htmlFor='received_at'>Received Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'outline'}
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !data.received_at && 'text-muted-foreground',
                                )}
                                disabled={processing}
                            >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {data.received_at ? format(data.received_at, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0'>
                           <Calendar
    mode='single'
    selected={data.received_at}
    onSelect={(date) => {
        if (date) {
            // Ensure the date is set to noon to avoid timezone issues
            const safeDate = new Date(date);
            safeDate.setHours(12, 0, 0, 0);
            setData('received_at', safeDate);
        } else {
            setData('received_at', undefined);
        }
    }}
    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
    initialFocus
/>
                        </PopoverContent>
                    </Popover>
                    <InputError message={errors.received_at} />
                </div>
                <div>
                    <Label htmlFor='expiration_date'>Expiration Date (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={'outline'}
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !data.expiration_date && 'text-muted-foreground',
                                )}
                                disabled={processing}
                            >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {data.expiration_date ? (
                                    format(data.expiration_date, 'PPP')
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0'>
                            <Calendar
    mode='single'
    selected={data.expiration_date}
    onSelect={(date) => {
        if (date) {
            // Ensure the date is set to noon to avoid timezone issues
            const safeDate = new Date(date);
            safeDate.setHours(12, 0, 0, 0);
            setData('expiration_date', safeDate);
        } else {
            setData('expiration_date', undefined);
        }
    }}
    initialFocus
/>
                        </PopoverContent>
                    </Popover>
                    <InputError message={errors.expiration_date} />
                </div>
            </div>

            {/* Cost fields - only show for by_measure tracking type */}


            <div className='flex items-center justify-end gap-4 pt-4'>{children}</div>
        </form>
    );
}
