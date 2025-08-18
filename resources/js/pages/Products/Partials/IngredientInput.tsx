import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type InventoryItem } from '@/types';
import { cn } from '@/lib/utils';

interface Ingredient {
    inventory_item_id: string;
    quantity_required: string;
}

interface IngredientInputProps {
    ingredients: Ingredient[];
    inventoryItems: (InventoryItem & { unit: string })[];
    setIngredients: (ingredients: Ingredient[]) => void;
    errors: Partial<Record<string, string>>;
}

export default function IngredientInput({ ingredients, inventoryItems, setIngredients, errors }: IngredientInputProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { inventory_item_id: '', quantity_required: '' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients);
    };

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
        const newIngredients = ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing));
        setIngredients(newIngredients);
    };

    const getUnitForItem = (itemId: string) => {
        return inventoryItems.find((item) => item.id.toString() === itemId)?.unit || 'units';
    };

    const getItemName = (itemId: string) => {
        return inventoryItems.find((item) => item.id.toString() === itemId)?.name || '';
    };

    const hasValidIngredients = ingredients.some(ing =>
        ing.inventory_item_id && ing.quantity_required && parseFloat(ing.quantity_required) > 0
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>Recipe Ingredients</CardTitle>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[250px]">
                                    <p>Define what inventory items are required to make one unit of this product</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Badge
                        variant={hasValidIngredients ? "default" : "outline"}
                        className={cn(!hasValidIngredients && "text-muted-foreground")}
                    >
                        {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                    </Badge>
                </div>
                <CardDescription>
                    Specify quantities needed per product serving
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Mobile collapsible content */}
                <Collapsible
                    open={!isCollapsed}
                    onOpenChange={(open) => setIsCollapsed(!open)}
                    className="md:hidden"
                >
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex w-full justify-between p-2">
                            <span>Ingredient List</span>
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        {renderIngredientList()}
                    </CollapsibleContent>
                </Collapsible>

                {/* Desktop always visible content */}
                <div className="hidden md:block">
                    {renderIngredientList()}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddIngredient}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                </Button>

                {errors.ingredients && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.ingredients}</AlertDescription>
                    </Alert>
                )}

                {ingredients.length > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <p>Inventory will be automatically deducted based on this recipe when sales are recorded.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    function renderIngredientList() {
        return (
            <div className="space-y-3">
                {ingredients.length > 0 ? (
                    <ScrollArea className="max-h-[350px] pr-2">
                        <div className="space-y-3 pr-1">
                            {ingredients.map((ingredient, index) => {
                                const hasItem = !!ingredient.inventory_item_id;
                                const itemError = errors[`ingredients.${index}.inventory_item_id`];
                                const quantityError = errors[`ingredients.${index}.quantity_required`];
                                const hasError = !!(itemError || quantityError);

                                return (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-md",
                                            hasError ? "bg-destructive/5 border border-destructive/50" : "bg-muted/40 border"
                                        )}
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <Label htmlFor={`ingredient-item-${index}`} className="text-sm">
                                                Ingredient
                                            </Label>
                                            <Select
                                                value={ingredient.inventory_item_id}
                                                onValueChange={(value) => handleIngredientChange(index, 'inventory_item_id', value)}
                                            >
                                                <SelectTrigger
                                                    id={`ingredient-item-${index}`}
                                                    className={itemError ? "border-destructive" : ""}
                                                >
                                                    <SelectValue placeholder="Select ingredient" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {inventoryItems.map((item) => (
                                                        <SelectItem key={item.id} value={item.id.toString()}>
                                                            {item.name} ({item.unit})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {itemError && <p className="text-xs text-destructive">{itemError}</p>}
                                        </div>

                                        <div className="w-full sm:w-40 space-y-1.5">
                                            <Label htmlFor={`ingredient-quantity-${index}`} className="text-sm">
                                                Quantity
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id={`ingredient-quantity-${index}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={ingredient.quantity_required}
                                                    onChange={(e) => handleIngredientChange(index, 'quantity_required', e.target.value)}
                                                    placeholder="Amount"
                                                    className={cn("pr-14", quantityError && "border-destructive")}
                                                />
                                                {hasItem && (
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">
                                                        {getUnitForItem(ingredient.inventory_item_id)}
                                                    </div>
                                                )}
                                            </div>
                                            {quantityError && <p className="text-xs text-destructive">{quantityError}</p>}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleRemoveIngredient(index)}
                                            className="shrink-0 self-start sm:self-end"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-muted-foreground mb-2">No ingredients added yet</p>
                        <p className="text-sm text-muted-foreground mb-4">Add ingredients to define what's needed to make this product</p>
                    </div>
                )}
            </div>
        );
    }
}
