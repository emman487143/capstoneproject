import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import  InputError  from '@/components/input-error';

interface CategoryFormData {
    name: string;
}

interface CategoryFormProps {
    data: CategoryFormData;
    setData: <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => void;
    errors: Partial<Record<keyof CategoryFormData, string>>;
}

export default function CategoryForm({ data, setData, errors }: CategoryFormProps) {
    return (
        <div className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                    autoFocus
                />
                <InputError message={errors.name} />
            </div>
        </div>
    );
}
