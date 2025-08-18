import { Link } from '@inertiajs/react';
import { MoreVertical, MapPin, Phone, Hash, AlertTriangle } from 'lucide-react';

import { Branch } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface BranchCardProps {
    branch: Branch & { employees_count: number; near_expiry_portions_count: number };
    onArchive: (branch: Branch) => void;
}

export default function BranchCard({ branch, onArchive }: BranchCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        {branch.name}
                        <Badge variant="secondary">{branch.code}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {branch.address}
                    </CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <DropdownMenuItem asChild>
                            <Link href={route('branches.edit', branch.id)}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => setTimeout(() => onArchive(branch), 0)}
                            className="text-red-600 focus:text-red-500"
                        >
                            Archive
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {branch.phone_number && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-2 h-4 w-4" />
                        <span>{branch.phone_number}</span>
                    </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                    <Hash className="mr-2 h-4 w-4" />
                    <span>{branch.employees_count} Employees</span>
                </div>
                {branch.near_expiry_portions_count > 0 && (
                     <div className="flex items-center text-sm text-amber-600">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>{branch.near_expiry_portions_count} items nearing expiry</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
