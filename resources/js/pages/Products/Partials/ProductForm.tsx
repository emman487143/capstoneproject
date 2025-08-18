import { useState } from 'react';
import { Trash2, ImageOff, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import IngredientInput from './IngredientInput';
import { type InventoryItem, type ProductCategory, type Product } from '@/types';

interface ProductFormData {
    name: string;
    description: string;
    price: string;
    product_category_id: string | null;
    is_addon: boolean;
    is_active: boolean;
    image: File | null;
    ingredients: {
        inventory_item_id: string;
        quantity_required: string;
    }[];
}

interface ProductFormProps {
    data: ProductFormData;
    setData: (key: keyof ProductFormData, value: any) => void;
    errors: Partial<Record<keyof ProductFormData | string, string>>;
    categories: ProductCategory[];
    inventoryItems: InventoryItem[];
    existingProduct?: Product;
}

// Define interfaces for the extracted components
interface BasicInfoCardProps {
    data: ProductFormData;
    setData: (key: keyof ProductFormData, value: any) => void;
    errors: Partial<Record<keyof ProductFormData | string, string>>;
    categories: ProductCategory[];
}

interface ImageCardProps {
    imagePreview: string | null;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeImage: () => void;
    errors: Partial<Record<string, string>>;
}

interface ProductTypeCardProps {
    data: ProductFormData;
    setData: (key: keyof ProductFormData, value: any) => void;
    errors: Partial<Record<keyof ProductFormData | string, string>>;
    existingProduct?: Product;
}

export default function ProductForm({
    data,
    setData,
    errors,
    categories,
    inventoryItems,
    existingProduct,
}: ProductFormProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(existingProduct?.image_url || null);
    const [activeTab, setActiveTab] = useState<string>("details");

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('image', file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setData('image', null);
        setImagePreview(null);
    };

    return (
        <div className="space-y-6">
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="recipe">Recipe</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="pt-4 space-y-6">
                        <BasicInfoCard
                            data={data}
                            setData={setData}
                            errors={errors}
                            categories={categories}
                        />

                        <ProductTypeCard
                            data={data}
                            setData={setData}
                            errors={errors}
                            existingProduct={existingProduct}
                        />
                    </TabsContent>

                    <TabsContent value="image" className="pt-4">
                        <ImageCard
                            imagePreview={imagePreview}
                            handleImageChange={handleImageChange}
                            removeImage={removeImage}
                            errors={errors}
                        />
                    </TabsContent>

                    <TabsContent value="recipe" className="pt-4">
                        <IngredientInput
                            ingredients={data.ingredients}
                            inventoryItems={inventoryItems}
                            setIngredients={(newIngredients) => setData('ingredients', newIngredients)}
                            errors={errors}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Desktop Layout - Single column with logical grouping */}
            <div className="hidden lg:block space-y-6">
                <BasicInfoCard
                    data={data}
                    setData={setData}
                    errors={errors}
                    categories={categories}
                />

                <div className="grid grid-cols-2 gap-6">
                    <ImageCard
                        imagePreview={imagePreview}
                        handleImageChange={handleImageChange}
                        removeImage={removeImage}
                        errors={errors}
                    />

                    <ProductTypeCard
                        data={data}
                        setData={setData}
                        errors={errors}
                        existingProduct={existingProduct}
                    />
                </div>

                <IngredientInput
                    ingredients={data.ingredients}
                    inventoryItems={inventoryItems}
                    setIngredients={(newIngredients) => setData('ingredients', newIngredients)}
                    errors={errors}
                />
            </div>
        </div>
    );
}

// Extract components to make the main component cleaner
function BasicInfoCard({ data, setData, errors, categories }: BasicInfoCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Information</CardTitle>
                <CardDescription>Define the core details of this menu item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">
                        Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Enter product name"
                        required
                        className={errors.name ? "border-destructive" : ""}
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="category">
                            Category <span className="text-destructive">*</span>
                        </Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-[200px]">Categories help organize your menu and make items easier to find</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Select
                        value={data.product_category_id || ''}
                        onValueChange={(value) => setData('product_category_id', value)}
                    >
                        <SelectTrigger id="category" className={errors.product_category_id ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.product_category_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Describe your product"
                        rows={3}
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="price">
                        Price (₱) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                        placeholder="0.00"
                        required
                        className={errors.price ? "border-destructive" : ""}
                    />
                    <InputError message={errors.price} />
                </div>
            </CardContent>
        </Card>
    );
}

function ImageCard({ imagePreview, handleImageChange, removeImage, errors }: ImageCardProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Product Image</CardTitle>
                <CardDescription>Upload a photo of your menu item</CardDescription>
            </CardHeader>
            <CardContent>
                {imagePreview ? (
                    <div className="mb-4 relative">
                        <img
                            src={imagePreview}
                            alt="Product Preview"
                            className="w-full aspect-square object-cover rounded-md"
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-8 text-center mb-4">
                        <ImageOff className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No image selected</p>
                    </div>
                )}

                <Label htmlFor="image" className="block mb-2">Upload Image (Optional)</Label>
                <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={errors.image ? "border-destructive" : ""}
                />
                <InputError message={errors.image} />
                <p className="text-xs text-muted-foreground mt-2">
                    Recommended: Square images with minimum 500x500px resolution
                </p>
            </CardContent>
        </Card>
    );
}

function ProductTypeCard({ data, setData, errors, existingProduct }: ProductTypeCardProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Product Type</CardTitle>
                <CardDescription>Define how this product is used in your menu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_addon" className="text-base">
                            {data.is_addon ? 'Add-on Item' : 'Main Menu Item'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {data.is_addon
                                ? 'Can be added to main menu items'
                                : 'Standalone item that can be ordered directly'}
                        </p>
                    </div>
                    <Switch
                        id="is_addon"
                        checked={data.is_addon}
                        onCheckedChange={(checked) => setData('is_addon', checked)}
                    />
                </div>
                <InputError message={errors.is_addon} />

                {/* Only show the is_active toggle if it's an existing product */}
                {existingProduct && (
                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active" className="text-base">
                                {data.is_active ? 'Active Product' : 'Inactive Product'}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {data.is_active
                                    ? 'Available for staff to record sales'
                                    : 'Hidden from sales recording interface'}
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked)}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
