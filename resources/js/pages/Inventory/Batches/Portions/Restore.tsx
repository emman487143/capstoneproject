import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { format } from 'date-fns';
import { LoaderCircle } from 'lucide-react';

import { AdjustedPortion, BreadcrumbItem, InventoryBatch, SharedData } from '@/types';
import AppLayout from '@/layouts/app-layout';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RestorePageProps extends SharedData {
    batch: InventoryBatch;
    adjustedPortions: AdjustedPortion[];
}

interface RestoreFormData {
    portion_ids: number[];
    reason: string;
    [key: string]: string | number | boolean | File | Blob | number[] | string[] | null | undefined;
}

export default function Restore({ batch, adjustedPortions }: RestorePageProps) {
    const [selectAll, setSelectAll] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: route('dashboard') },
        { title: 'Inventory', href: route('inventory.index') },
        {
            title: batch.inventory_item.name,
            href: route('inventory.items.batches.index', { item: batch.inventory_item.id }),
        },
        {
            title: `Batch #${batch.batch_number}`,
            href: route('inventory.batches.show', batch.id),
        },
        { title: 'Restore Portions', href: '#' },
    ];

    const { data, setData, post, processing, errors } = useForm<RestoreFormData>({
        portion_ids: [],
        reason: '',
    });

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setData('portion_ids', adjustedPortions.map(p => p.id));
        } else {
            setData('portion_ids', []);
        }
    };

    const handlePortionToggle = (id: number, checked: boolean) => {
        const newPortionIds = checked
            ? [...data.portion_ids, id]
            : data.portion_ids.filter(portionId => portionId !== id);

        setData('portion_ids', newPortionIds);
        setSelectAll(newPortionIds.length === adjustedPortions.length);
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'spoiled':
                return 'destructive';
            case 'wasted':
                return 'destructive';
            case 'adjusted':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getAdjustmentTypeLabel = (type: string | null): string => {
        if (!type) return 'Unknown';

        switch (type) {
            case 'adjustment_spoilage': return 'Spoilage';
            case 'adjustment_waste': return 'Waste';
            case 'adjustment_theft': return 'Theft';
            case 'adjustment_other': return 'Other';
            default: return type.replace('adjustment_', '');
        }
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('inventory.batches.portions.restore', batch.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Restore Portions - Batch #${batch.batch_number}`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Heading
                    title="Restore Portions"
                    description={`Restore previously adjusted portions for batch #${batch.batch_number} of ${batch.inventory_item.name}.`}
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Select Portions to Restore</CardTitle>
                        <CardDescription>
                            These portions were previously removed from inventory through adjustments.
                            Restoring them will make them available for use again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {adjustedPortions.length > 0 ? (
                                <>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={selectAll}
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        />
                                        <Label htmlFor="select-all" className="font-medium">
                                            Select All ({adjustedPortions.length} portions)
                                        </Label>
                                    </div>

                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead>Portion ID</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Adjustment Type</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {adjustedPortions.map((portion) => (
                                                    <TableRow key={portion.id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                id={`portion-${portion.id}`}
                                                                checked={data.portion_ids.includes(portion.id)}
                                                                onCheckedChange={(checked) =>
                                                                    handlePortionToggle(portion.id, !!checked)
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-mono">{portion.label}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusBadgeVariant(portion.status)}>
                                                                {portion.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getAdjustmentTypeLabel(portion.adjustment_type)}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate">
                                                            {portion.adjustment_reason}
                                                        </TableCell>
                                                        <TableCell>
                                                            {portion.adjustment_date ?
                                                                format(new Date(portion.adjustment_date), 'PPP p') :
                                                                'Unknown'
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {data.portion_ids.length > 0 && (
                                        <div className="bg-muted/30 p-3 rounded-md text-sm">
                                            <span className="font-medium">{data.portion_ids.length}</span> portions selected for restoration
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason for Restoration</Label>
                                        <Textarea
                                            id="reason"
                                            value={data.reason}
                                            onChange={e => setData('reason', e.target.value)}
                                            placeholder="Explain why these portions are being restored to inventory"
                                            className="min-h-[100px]"
                                        />
                                        <InputError message={errors.reason} />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    No adjusted portions found for this batch that can be restored.
                                </div>
                            )}

                            <CardFooter className="px-0 pt-4">
                                <div className="flex justify-end gap-2 w-full">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.history.back()}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing || data.portion_ids.length === 0 || !data.reason}
                                    >
                                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Restore {data.portion_ids.length} {data.portion_ids.length === 1 ? 'Portion' : 'Portions'}
                                    </Button>
                                </div>
                            </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
