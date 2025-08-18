import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InventoryBatch, InventoryItem } from '@/types';
import { PlusCircle, PackageSearch } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

interface Props {
    items: (InventoryItem & { batches: InventoryBatch[] })[];
    onSelectItem: (batch: InventoryBatch & { inventory_item: InventoryItem }) => void;
    isLoading: boolean;
}

export default function AvailableItemsList({ items, onSelectItem, isLoading }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter((item) => {
        const searchTermLower = searchTerm.toLowerCase();
        const itemNameMatch = item.name.toLowerCase().includes(searchTermLower);
        const batchNumberMatch = item.batches.some((batch) =>
            String(batch.batch_number).toLowerCase().includes(searchTermLower),
        );
        return itemNameMatch || batchNumberMatch;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Inventory</CardTitle>
                <Input
                    placeholder="Search by item name or batch number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                    disabled={isLoading}
                />
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {filteredItems.map((item) => (
                                <AccordionItem value={`item-${item.id}`} key={item.id}>
                                    <AccordionTrigger className="font-medium">{item.name}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 pt-2">
                                            {item.batches.map((batch) => (
                                                <li
                                                    key={batch.id}
                                                    className="flex items-center justify-between rounded-md p-2 pl-4 hover:bg-muted"
                                                >
                                                    <div>
                                                        <p className="font-semibold">Batch #{batch.batch_number}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {batch.remaining_quantity} {item.unit} available
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onSelectItem({ ...batch, inventory_item: item })}
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                            <PackageSearch className="mb-4 h-12 w-12" />
                            <p className="font-semibold">No Items Found</p>
                            <p className="text-sm">No inventory matches your search or is available at this branch.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
