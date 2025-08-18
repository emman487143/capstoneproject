import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Employee } from '@/types';
import { Archive, Building2, Edit, MoreVertical, Phone, UserCheck, UserX } from 'lucide-react';

interface EmployeeCardProps {
    employee: Employee;
    onToggleStatus: (employee: Employee) => void;
    onArchive: (employee: Employee) => void;
}

export default function EmployeeCard({ employee, onToggleStatus, onArchive }: EmployeeCardProps) {
    const initials = `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`.toUpperCase();
    const hasAccount = !!employee.user_id;
    const toggleActionText = employee.is_active ? 'Deactivate' : 'Activate';
    const ToggleIcon = employee.is_active ? UserX : UserCheck;

    return (
        <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                        {initials}
                    </div>
                    <div className="grid gap-0.5">
                        <p className="font-semibold leading-none">{employee.full_name}</p>
                        <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mt-2">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={route('employees.edit', employee.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </Link>
                        </DropdownMenuItem>
                        {employee.user_id && (
                            <DropdownMenuItem onClick={() => onToggleStatus(employee)}>
                                <ToggleIcon className="mr-2 h-4 w-4" />
                                <span>{toggleActionText}</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onArchive(employee)}
                            className="focus:bg-destructive/80 focus:text-destructive-foreground"
                        >
                            <Archive className="mr-2 h-4 w-4" />
                            <span>Archive</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div>
                    {hasAccount ? (
                        <Badge className="flex items-center gap-1.5 border-green-600/40 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600/40 dark:bg-green-950 dark:text-green-400">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Has Account</span>
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="flex items-center gap-1.5">
                            <UserX className="h-3.5 w-3.5" />
                            <span>No Account</span>
                        </Badge>
                    )}
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span>{employee.branch?.name ?? 'N/A'}</span>
                    </div>
                    {employee.contact_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span>{employee.contact_number}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
