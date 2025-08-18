import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CartItem } from '@/types';
import { PackagePlus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
    cartItems: CartItem[];
    onRemoveItem: (index: number) => void;
}

export default function TransferCart({ cartItems, onRemoveItem }: Props) {
    // Count total items for a quick summary
    const totalItems = cartItems.reduce((count, item) => {
        if (item.tracking_type === 'by_portion') {
            return count + item.portion_ids.length;
        } else {
            return count + item.batches.reduce((sum, b) => sum + 1, 0);
        }
    }, 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Transfer List</CardTitle>
                    <CardDescription>Items to be sent in this transfer.</CardDescription>
                </div>
                {cartItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                    </Badge>
                )}
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] sm:h-[300px] lg:h-[400px] pr-4">
                    {cartItems.length > 0 ? (
                        <ul className="space-y-4">
                            {cartItems.map((item, index) => (
                                <li key={`${item.inventory_item_id}-${index}`} className="p-3 rounded-md border">
                                    <div className="flex items-start justify-between">
                                        <p className="font-medium">{item.name}</p>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <div className="pl-2 mt-1 text-sm text-muted-foreground">
                                        {item.tracking_type === 'by_measure' ? (
                                            <ul className="list-disc list-inside">
                                                {item.batches.map((batch) => (
                                                    <li key={batch.batch_id}>
                                                        <span className="font-medium">{batch.quantity} {item.unit}</span> from Batch #{batch.batch_number}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">Portions:</span>
                                                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{item.portion_ids.length}</span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.portion_labels.map((label, i) => (
                                                        <span key={i} className="inline-block bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <PackagePlus className="h-12 w-12 mb-4" />
                            <p className="font-semibold">Your list is empty</p>
                            <p className="text-sm">Add items from the inventory list to get started.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
