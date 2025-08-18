import AppLayout from '@/layouts/app-layout';
import { Auth, Branch, BreadcrumbItem, CartItem, InventoryBatch, InventoryItem, TransferForm } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import axios from 'axios';
import Heading from '@/components/heading';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Textarea } from '@/components/ui/textarea';
import AvailableItemsList from './Partials/AvailableItemsList';
import TransferCart from './Partials/TransferCart';
import ItemSelectionModal from './Partials/ItemSelectionModal';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTransferProps {
    currentBranch: Branch | null;
    sourceBranches: Branch[];
    destinationBranches: Branch[];
}

type AvailableItem = InventoryItem & { batches: InventoryBatch[] };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Transfers', href: route('inventory.transfers.index') },
    { title: 'Create', href: route('inventory.transfers.create') },
];

export default function Create({ currentBranch, sourceBranches, destinationBranches }: CreateTransferProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [selectedItem, setSelectedItem] = useState<(InventoryBatch & { inventory_item: InventoryItem }) | null>(null);

    const form = useForm<TransferForm>({
        source_branch_id: auth.user.is_admin ? '' : String(currentBranch?.id ?? ''),
        destination_branch_id: '',
        notes: '',
        items: [],
    });

    useEffect(() => {
        if (!form.data.source_branch_id) {
            setAvailableItems([]);
            return;
        }

        setIsLoadingInventory(true);
        axios
            .get(route('inventory.transfers.get-inventory', { branch: form.data.source_branch_id }))
            .then((response) => {
                // The API now returns grouped data, which we set directly.
                setAvailableItems(response.data);
            })
            .catch(() => toast.error('Failed to load inventory. Please try again.'))
            .finally(() => setIsLoadingInventory(false));
    }, [form.data.source_branch_id]);

    const handleSourceBranchChange = (branchId: string) => {
        form.setData((data) => ({
            ...data,
            source_branch_id: branchId,
            destination_branch_id: '',
            items: [],
        }));
    };

    const handleAddItemToCart = (newItem: CartItem) => {
        form.setData((currentData) => {
            const updatedItems = [...currentData.items];
            const existingItemIndex = updatedItems.findIndex((i) => i.inventory_item_id === newItem.inventory_item_id);

            if (existingItemIndex > -1) {
                const existingItem = updatedItems[existingItemIndex];

                // Logic for items tracked by batch
                if (existingItem.tracking_type === 'by_measure' && newItem.tracking_type === 'by_measure') {
                    const newBatch = newItem.batches[0];
                    const existingBatchIndex = existingItem.batches.findIndex((b) => b.batch_id === newBatch.batch_id);

                    if (existingBatchIndex > -1) {
                        const existingBatch = existingItem.batches[existingBatchIndex];
                        const newQuantity = existingBatch.quantity + newBatch.quantity;

                        if (newQuantity > existingBatch.available) {
                            toast.error(`Cannot add more than the available ${existingBatch.available} ${existingItem.unit} for Batch #${existingBatch.batch_number}.`);
                            return currentData; // Abort update
                        }
                        existingBatch.quantity = newQuantity;
                    } else {
                        existingItem.batches.push(newBatch);
                    }
                    // Logic for items tracked by portion
                } else if (existingItem.tracking_type === 'by_portion' && newItem.tracking_type === 'by_portion') {
                    const newPortionIds = newItem.portion_ids.filter(id => !existingItem.portion_ids.includes(id));
                    const newPortionLabels = newItem.portion_labels.filter(label => !existingItem.portion_labels.includes(label));

                    if (newPortionIds.length !== newItem.portion_ids.length) {
                        toast.warning('Some selected portions were already in the cart and have been ignored.');
                    }

                    existingItem.portion_ids.push(...newPortionIds);
                    existingItem.portion_labels.push(...newPortionLabels);

                    newItem.batches.forEach(newBatch => {
                        const existingBatchInCart = existingItem.batches.find(b => b.batch_id === newBatch.batch_id);
                        if (existingBatchInCart) {
                            existingBatchInCart.quantity += newBatch.quantity;
                        } else {
                            existingItem.batches.push(newBatch);
                        }
                    });
                }
                updatedItems[existingItemIndex] = existingItem;
            } else {
                // If the item is not in the cart at all, add it.
                updatedItems.push(newItem);
            }

            toast.success(`${newItem.name} added to transfer.`);
            return { ...currentData, items: updatedItems };
        });
    };

    const handleRemoveItemFromCart = (indexToRemove: number) => {
        form.setData('items', form.data.items.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('inventory.transfers.store'), {
            onError: (errors) => {
                console.error(errors);
                if (errors.items) {
                    toast.error('Validation Error', { description: errors.items });
                } else {
                    toast.error('There was a problem with your submission. Please review the errors.');
                }
            },
        });
    };

    const filteredDestinations = destinationBranches.filter((b) => String(b.id) !== String(form.data.source_branch_id));
    const destinationBranchName = destinationBranches.find((b) => String(b.id) === form.data.destination_branch_id)?.name || '...';

    // CORRECTED: This validation constant ensures the cart is not empty AND that items have a valid quantity.
    const isCartValid = form.data.items.length > 0 && form.data.items.every(item => {
        if (item.tracking_type === 'by_portion') {
            return item.portion_ids.length > 0;
        }
        if (item.tracking_type === 'by_measure') {
            return item.batches.length > 0 && item.batches.every(b => b.quantity > 0);
        }
        return false;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create New Transfer" />

            <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 lg:p-8">
                <Heading
                    title="Create New Stock Transfer"
                    description={
                        auth.user.is_admin
                            ? 'Select a source and destination branch to initiate a transfer.'
                            : `Initiate a transfer of inventory from ${currentBranch?.name}.`
                    }
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {auth.user.is_admin && (
                        <div>
                            <Label htmlFor="source_branch_id">Source Branch</Label>
                            <Select value={String(form.data.source_branch_id)} onValueChange={handleSourceBranchChange} required>
                                <SelectTrigger id="source_branch_id">
                                    <SelectValue placeholder="Select a source..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sourceBranches.map((branch) => (
                                        <SelectItem key={branch.id} value={String(branch.id)}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.source_branch_id} className="mt-2" />
                        </div>
                    )}
                    <div>
                        <Label htmlFor="destination_branch_id">Destination Branch</Label>
                        <Select
                            value={form.data.destination_branch_id}
                            onValueChange={(value) => form.setData('destination_branch_id', value)}
                            required
                            disabled={!form.data.source_branch_id}
                        >
                            <SelectTrigger id="destination_branch_id">
                                <SelectValue placeholder="Select a destination..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredDestinations.map((branch) => (
                                    <SelectItem key={branch.id} value={String(branch.id)}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.destination_branch_id} className="mt-2" />
                    </div>
                    <div className="lg:col-span-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="e.g., Urgent request for weekend stock."
                        />
                        <InputError message={form.errors.notes} className="mt-2" />
                    </div>
                </div>

                {/* Two-column layout on larger screens, stack on mobile */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
                    <div className="order-2 lg:order-1">
                        <AvailableItemsList
                            items={availableItems}
                            onSelectItem={(item) => setSelectedItem(item)}
                            isLoading={isLoadingInventory}
                        />
                    </div>
                    <div className="order-1 lg:order-2">
                        <TransferCart cartItems={form.data.items} onRemoveItem={handleRemoveItemFromCart} />
                    </div>
                </div>
                <InputError message={form.errors.items} />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={form.processing || !isCartValid || !form.data.destination_branch_id}
                    >
                        {form.processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Initiate Transfer to {destinationBranchName}
                    </Button>
                </div>
            </form>

            <ItemSelectionModal
                item={selectedItem}
                sourceBranchId={form.data.source_branch_id}
                onClose={() => setSelectedItem(null)}
                onAddItem={handleAddItemToCart}
            />
        </AppLayout>
    );
}
