import React, { useState } from 'react';
import { Building, ChevronDown, ChevronUp, Info, Store } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { type Branch } from '@/types';

// Update the interface to match what's used in Create.tsx
interface BranchAvailabilityData {
  branch_id: number;
  name: string;
  is_available: boolean;
}

interface BranchAvailabilityProps {
  branches: BranchAvailabilityData[];
  setBranches: (branches: BranchAvailabilityData[]) => void;
  errors: Record<string, string | undefined>;
}

export default function BranchAvailability({ branches, setBranches, errors }: BranchAvailabilityProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Count how many branches this product is available at
  const availableBranchCount = branches.filter((branch) => branch.is_available).length;

  // Helper function to toggle all branches
  const toggleAllBranches = (value: boolean) => {
    setBranches(branches.map((branch) => ({ ...branch, is_available: value })));
  };

  const handleBranchAvailabilityChange = (index: number, isAvailable: boolean) => {
    setBranches(
      branches.map((branch, i) => (i === index ? { ...branch, is_available: isAvailable } : branch))
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <Store className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <CardTitle>Branch Availability</CardTitle>
              <CardDescription>Select which branches will offer this product</CardDescription>
            </div>
          </div>
          <Badge variant={availableBranchCount > 0 ? 'default' : 'outline'} className="ml-2">
            {availableBranchCount} of {branches.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {branches.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No branches available.</div>
        ) : (
          <div className="space-y-3">
            {/* Quick actions row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {availableBranchCount === branches.length
                  ? 'Available at all branches'
                  : availableBranchCount === 0
                  ? 'Not available at any branch'
                  : `Available at ${availableBranchCount} of ${branches.length} branches`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllBranches(true)}
                  className="text-xs h-8"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllBranches(false)}
                  className="text-xs h-8"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* On mobile, make the list collapsible */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex w-full justify-between p-2">
                  <span>Branch List</span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>{renderBranchList()}</CollapsibleContent>
            </Collapsible>

            {/* On desktop, always show the list */}
            <div className="hidden md:block">{renderBranchList()}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  function renderBranchList() {
    return (
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {branches.map((branch, index) => (
          <div
            key={branch.branch_id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-md border',
              branch.is_available && 'bg-muted/40'
            )}
          >
            <Checkbox
              id={`branch-available-${branch.branch_id}`}
              checked={branch.is_available}
              onCheckedChange={(checked) => handleBranchAvailabilityChange(index, !!checked)}
            />
            <div className="grid flex-1 gap-0.5">
              <Label
                htmlFor={`branch-available-${branch.branch_id}`}
                className={cn('font-medium', branch.is_available ? '' : 'text-muted-foreground')}
              >
                {branch.name}
              </Label>
              {errors[`branches.${index}.is_available`] && (
                <InputError message={errors[`branches.${index}.is_available`]} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
}
