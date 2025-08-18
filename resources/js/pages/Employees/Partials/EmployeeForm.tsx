import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Branch, User } from '@/types';
import InputError from '@/components/input-error';


export interface EmployeeFormData {
    first_name: string;
    last_name: string;
    job_title: string;
    contact_number: string;
    branch_id: string;
    is_active: boolean;
    create_user_account: boolean;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    // CRITICAL FIX: Add index signature to satisfy Inertia's FormDataType constraint.
    // This allows Inertia's form helper to access properties with string keys.
    [key: string]: string | boolean;
}

interface EmployeeFormProps {
    data: EmployeeFormData;
    setData: <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => void;
    errors: Partial<Record<keyof EmployeeFormData, string>>;
    processing: boolean;
    branches: Branch[];
    existingUser: User | null;
}

export default function EmployeeForm({ data, setData, errors, processing, branches, existingUser }: EmployeeFormProps) {
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                    <CardDescription>Enter the primary details for the employee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                value={data.first_name}
                                placeholder='Enter first name'
                                onChange={(e) => setData('first_name', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.first_name} />
                        </div>
                        <div>
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                value={data.last_name}
                                placeholder='Enter last name'
                                onChange={(e) => setData('last_name', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.last_name} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="job_title">Job Title</Label>
                        <Input
                            id="job_title"
                            value={data.job_title}
                            placeholder='Enter job title'
                            onChange={(e) => setData('job_title', e.target.value)}
                            disabled={processing}
                        />
                        <InputError message={errors.job_title} />
                    </div>
                    <div>
                        <Label htmlFor="contact_number">Contact Number</Label>
                        <Input
                            id="contact_number"
                            value={data.contact_number}
                            placeholder='Enter contact number'
                            onChange={(e) => setData('contact_number', e.target.value)}
                            disabled={processing}
                        />
                        <InputError message={errors.contact_number} />
                    </div>
                    <div>
                        <Label htmlFor="branch_id">Branch</Label>
                        <Select
                            value={data.branch_id}
                            onValueChange={(value) => setData('branch_id', value)}
                            disabled={processing}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={String(branch.id)}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.branch_id} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>System Account</CardTitle>
                    <CardDescription>
                        {existingUser
                            ? 'This employee has a system account.'
                            : 'Optionally create a system account for this employee to allow them to log in.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="create_user_account"
                            checked={data.create_user_account}
                            onCheckedChange={(checked) => setData('create_user_account', Boolean(checked))}
                            disabled={!!existingUser || processing}
                        />
                        <Label htmlFor="create_user_account">Create a system account for this employee</Label>
                    </div>

                    {data.create_user_account && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email">Account Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    disabled={!!existingUser || processing}
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div>
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={data.role}
                                    onValueChange={(value) => setData('role', value)}
                                    disabled={processing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.role} />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        placeholder="Enter password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        disabled={processing}
                                    />
                                    {existingUser && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Leave blank to keep the current password.
                                        </p>
                                    )}
                                    <InputError message={errors.password} />
                                </div>
                                <div>
                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        disabled={processing}
                                        placeholder="Confirm password"
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            </>
    );
}
