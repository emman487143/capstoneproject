import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Branch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { LoaderCircle } from 'lucide-react';

// Define the form data structure to match the backend
type BranchFormData = {
    name: string;
    code: string;
    address: string;
    phone_number: string;
};

// Define the props for the Inertia form hook
export type InertiaFormProps = ReturnType<typeof useForm<BranchFormData>>;

// Define the props for the BranchForm component
interface BranchFormProps {
    branch?: Branch;
    onSubmit: (form: InertiaFormProps) => void;
    submitButtonText?: string;
}

export default function BranchForm({ branch, onSubmit, submitButtonText = 'Save Changes' }: BranchFormProps) {
    const form = useForm<BranchFormData>({
        name: branch?.name || '',
        code: branch?.code || '',
        address: branch?.address || '',
        phone_number: branch?.phone_number || '',
    });

    const { errors, processing } = form;

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="name">Branch Name</Label>
                    <Input
                        id="name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        required
                        disabled={processing}
                        placeholder="Enter branch name"
                    />
                    <InputError message={errors.name} />
                </div>
                <div>
                    <Label htmlFor="code">Branch Code</Label>
                    <Input
                        id="code"
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value)}
                        required
                        disabled={processing}
                        placeholder="Enter short code for labels/reports"
                    />
                    <InputError message={errors.code} />
                </div>
            </div>

            <div>
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    value={form.data.address}
                    onChange={(e) => form.setData('address', e.target.value)}
                    required
                    disabled={processing}
                    placeholder="Enter complete branch address"
                />
                <InputError message={errors.address} />
            </div>

            <div>
                <Label htmlFor="phone_number">Phone Number (Optional)</Label>
                <Input
                    id="phone_number"
                    value={form.data.phone_number}
                    onChange={(e) => form.setData('phone_number', e.target.value)}
                    disabled={processing}
                    placeholder="Enter contact number"
                />
                <InputError message={errors.phone_number} />
            </div>

            <div className="flex justify-end mt-6">
                <Button type="submit" disabled={processing}>
                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {submitButtonText}
                </Button>
            </div>
        </form>
    );
}
