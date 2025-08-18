import { router } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Branch } from '@/types';

interface BranchSwitcherProps {
    branches: Branch[];
    currentBranch: Branch | null;
    className?: string;
    onBranchChange: (branchId: string) => void;
}

export default function BranchSwitcher({ branches, currentBranch, className, onBranchChange }: BranchSwitcherProps) {
    return (
        <div className={className}>
            <Select
                value={currentBranch?.id.toString() ?? ''}
                onValueChange={onBranchChange}
                name="branch-switcher"
            >
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Select a branch..." />
                </SelectTrigger>
                <SelectContent>
                    {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
