import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';

interface CategoryFormProps {
    data: { name: string };
    setData: (key: 'name', value: string) => void;
    errors: any;
    processing: boolean;
}

export default function CategoryForm({ data, setData, errors, processing }: CategoryFormProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="name">Category Name*</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="e.g., Meats, Vegetables, Noodles"
                        required
                        disabled={processing}
                    />
                    <InputError message={errors.name} />
                </div>
            </CardContent>
        </Card>
    );
}
