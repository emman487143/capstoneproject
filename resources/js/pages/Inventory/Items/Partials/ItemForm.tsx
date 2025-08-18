import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { InventoryCategory, InventoryItem, ItemFormData } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Info, Package, Scale } from 'lucide-react';
import InputError from '@/components/input-error';

interface ItemFormProps<T extends ItemFormData> {
    data: T;
    setData: (key: keyof T, value: any) => void;
    errors: Partial<Record<keyof T, string>>;
    processing: boolean;
    categories: InventoryCategory[];
    isEditMode?: boolean;
    hasBatches?: boolean;
}

export default function ItemForm({
    data,
    setData,
    errors,
    processing,
    categories,
    isEditMode = false,
    hasBatches = false,
}: ItemFormProps<ItemFormData>) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>
                    Define the basic information and tracking method for this inventory item.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Item name and code - 2 columns on desktop, stack on mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Item Name*</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Enter item name"
                                required
                                disabled={processing}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Item Code*</Label>
                            <Input
                                id="code"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                required
                                disabled={processing}
                                placeholder="Short code for labels (e.g., PORK-B)"
                            />
                            <InputError message={errors.code} />
                        </div>
                    </div>

                    {/* Category and Expiry Warning - 2 columns on desktop, stack on mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="inventory_category_id">Category*</Label>
                            <Select
                                name="inventory_category_id"
                                value={String(data.inventory_category_id)}
                                onValueChange={(value) => setData('inventory_category_id', value)}
                                disabled={processing}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select item category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.inventory_category_id} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="days_to_warn_before_expiry">Expiry Warning (Days)*</Label>
                            <Input
                                id="days_to_warn_before_expiry"
                                type="number"
                                value={data.days_to_warn_before_expiry ?? ''}
                                onChange={(e) => setData('days_to_warn_before_expiry', e.target.value)}
                                placeholder="Days before expiry to warn"
                                required
                                disabled={processing}
                                min="1"
                            />
                            <InputError message={errors.days_to_warn_before_expiry} />
                        </div>
                    </div>

                    {/* Unit of Measure */}
                    <div className="space-y-2">
                        <Label htmlFor="unit">Unit of Measure*</Label>
                        <Input
                            id="unit"
                            value={data.unit}
                            onChange={(e) => setData('unit', e.target.value)}
                            placeholder="How this item is measured (e.g., kg, pack, liter)"
                            required
                            disabled={processing}
                        />
                        <InputError message={errors.unit} />
                    </div>

                    {/* Improved Tracking Method Section */}
                    <div className="space-y-3">
                        <div>
                            <Label className="text-base">Inventory Tracking Method*</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select how you want to track this item in your inventory system.
                            </p>
                        </div>

                        <RadioGroup
                            value={data.tracking_type}
                            onValueChange={(value) => setData('tracking_type', value as ItemFormData['tracking_type'])}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                            disabled={processing || (isEditMode && hasBatches)}
                        >
                            {/* By Portion Option */}
                            <Label className="flex flex-col space-y-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="by_portion" id="by_portion" />
                                    <Package className="h-4 w-4 mr-1" />
                                    <span className="font-medium">By Portion (Individual Units)</span>
                                </div>
                                <div className="space-y-2 pl-7">
                                    <p className="text-sm">
                                        Track each distinct, countable unit individually.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <p className="font-medium mb-1">Best for:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Pre-portioned ingredients</li>

                                            <li>Items where each unit needs specific tracking</li>
                                        </ul>
                                    </div>
                                </div>
                            </Label>

                            {/* By Measure Option */}
                            <Label className="flex flex-col space-y-3 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="by_measure" id="by_measure" />
                                    <Scale className="h-4 w-4 mr-1" />
                                    <span className="font-medium">By Measure (Measured Quantity)</span>
                                </div>
                                <div className="space-y-2 pl-7">
                                    <p className="text-sm">
                                        Track by continuous quantities that can be partially used.
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                        <p className="font-medium mb-1">Best for:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Bulk ingredients (flour, rice, broth)</li>
                                            <li>Items measured by weight or volume</li>
                                            <li>Items where partial quantities are commonly used</li>
                                        </ul>
                                    </div>
                                </div>
                            </Label>
                        </RadioGroup>

                        {/* Warning about tracking method locked */}
                        {isEditMode && hasBatches && (
                            <div className="mt-2 flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
                                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span>
                                    The tracking method cannot be changed because this item already has inventory
                                    batches recorded in the system.
                                </span>
                            </div>
                        )}
                        <InputError message={errors.tracking_type} />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description ?? ''}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Add any notes or details about this item (optional)"
                            disabled={processing}
                            className="min-h-[100px]"
                        />
                        <InputError message={errors.description} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
