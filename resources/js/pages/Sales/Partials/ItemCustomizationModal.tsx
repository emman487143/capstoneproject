import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MinusCircle, Loader2, PlusCircle } from 'lucide-react';
import { Product } from '@/types';

interface InventoryItem {
    id: number;
    name: string;
}

interface CartItemModification {
    type: 'remove';
    inventory_item_id: number;
    name: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface CustomizationProps {
    productId: number;
    productName: string;
    productCategory?: string | number;
    instanceIndex: number;
    totalInstances: number;
    modifications: CartItemModification[];
    isOpen: boolean;
    relatedAddons?: Product[];
    onClose: () => void;
    onSave: (instanceIndex: number, modifications: CartItemModification[]) => void;
    onAddAddon?: (addon: Product) => void;
}

export default function ItemCustomizationModal({
    productId,
    productName,
    productCategory,
    instanceIndex,
    totalInstances,
    modifications = [],
    isOpen,
    relatedAddons = [],
    onClose,
    onSave,
    onAddAddon
}: CustomizationProps) {
    const [currentModifications, setCurrentModifications] = useState<CartItemModification[]>(modifications);
    const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError(null);

            axios.get(route('products.ingredients', productId))
                .then(response => {
                    setIngredients(response.data);
                })
                .catch(error => {
                    console.error('Failed to load ingredients:', error);
                    setError('Could not load ingredients. Please try again.');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isOpen, productId]);

    const toggleRemoveIngredient = (ingredientId: number, ingredientName: string) => {
        setCurrentModifications(current => {
            const existingIndex = current.findIndex(
                mod => mod.type === 'remove' && mod.inventory_item_id === ingredientId
            );

            if (existingIndex >= 0) {
                return current.filter((_, i) => i !== existingIndex);
            } else {
                return [
                    ...current,
                    {
                        type: 'remove',
                        inventory_item_id: ingredientId,
                        name: ingredientName
                    }
                ];
            }
        });
    };

    const handleSave = () => {
        onSave(instanceIndex, currentModifications);
        onClose();
    };

    const handleAddAddon = (addon: Product) => {
        if (onAddAddon) {
            onAddAddon(addon);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-900">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center flex-wrap gap-1 text-base sm:text-lg">
                        Customize {productName}
                        <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1">
                            (Item #{instanceIndex + 1} of {totalInstances})
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        Select ingredients to remove from this item
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading ingredients...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-destructive">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 rounded-xl px-4 py-2 shadow-sm"
                                onClick={() => {
                                    setError(null);
                                    onClose();
                                }}
                            >
                                Close
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Ingredient removal section */}
                            {ingredients.length > 0 ? (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium mb-3">Remove ingredients:</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {ingredients.map(ingredient => (
                                            <div key={ingredient.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`remove-${ingredient.id}`}
                                                    checked={currentModifications.some(
                                                        mod => mod.type === 'remove' && mod.inventory_item_id === ingredient.id
                                                    )}
                                                    onCheckedChange={() => toggleRemoveIngredient(ingredient.id, ingredient.name)}
                                                />
                                                <Label htmlFor={`remove-${ingredient.id}`} className="flex items-center text-sm cursor-pointer">
                                                    <MinusCircle className="h-3.5 w-3.5 mr-2 text-destructive" />
                                                    No {ingredient.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center py-4 text-sm text-muted-foreground">
                                    No customizable ingredients available for this product
                                </p>
                            )}

                            {/* Add-ons section - only show if we have related add-ons */}
                            {relatedAddons.length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="text-sm font-medium mb-3">Recommended add-ons:</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {relatedAddons.map(addon => (
                                            <Button
                                                key={addon.id}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddAddon(addon)}
                                                className="flex items-center justify-start h-auto py-2 px-3 rounded-xl shadow-sm"
                                            >
                                                <div className="flex flex-col items-start">
                                                    <div className="flex items-center">
                                                        <PlusCircle className="h-3.5 w-3.5 mr-2 text-primary" />
                                                        <span className="font-medium">{addon.name}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground mt-0.5">
                                                        ₱{parseFloat(addon.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={loading || !!error}
                        className="w-full sm:w-auto rounded-xl px-4 py-2 shadow-sm"
                    >
                        Save Changes
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto rounded-xl px-4 py-2 shadow-sm"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
