import React from 'react';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { Search, Receipt, ShoppingCart, Calendar, User, DollarSign, Clock } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Branch, type PaginatedResponse, type Sale } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Pagination from '@/components/pagination';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Heading from '@/components/heading';

interface IndexProps {
    sales: PaginatedResponse<Sale>;
    branches: Branch[];
    currentBranch: Branch | null;
    filters: { branch: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Log', href: route('sales.index') }];

export default function Index({ sales, branches, currentBranch, filters }: IndexProps) {
    const handleBranchChange = (branchId: string) => {
        router.get(route('sales.index'), { branch: branchId }, { preserveState: true });
    };

    // Helper to format dates consistently
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: format(date, 'MMM d, yyyy'),
            time: format(date, 'h:mm a')
        };
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Log" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Heading
                        title="Sales History"
                        description={
                            currentBranch
                                ? `Recorded sales for ${currentBranch.name}`
                                : 'All recorded sales transactions'
                        }
                    />
                    {branches.length > 1 && (
                        <div className="w-full sm:w-auto">
                            <Select
                                value={currentBranch?.id.toString()}
                                onValueChange={handleBranchChange}
                            >
                                <SelectTrigger className="w-full sm:w-[200px] rounded-xl shadow-sm">
                                    <SelectValue placeholder="Select a branch" />
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
                    )}
                </div>

                {/* Main Content Card */}
                <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden">
                    <CardHeader className="p-4 sm:p-6 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                <CardTitle>Sales Records</CardTitle>
                            </div>
                            {sales.data.length > 0 && (
                                <Badge variant="outline" className="bg-gray-50 border-gray-200 self-start sm:self-auto">
                                    {sales.total} {sales.total === 1 ? 'transaction' : 'transactions'}
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="mt-1.5">
                            {currentBranch ? `Transactions at ${currentBranch.name}` : 'All sales transactions'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Desktop/Tablet Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="whitespace-nowrap">Sale ID</TableHead>
                                        <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                                        <TableHead className="whitespace-nowrap">Cashier</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.data.length > 0 ? (
                                        sales.data.map((sale) => {
                                            const formattedDate = formatDate(sale.created_at);

                                            return (
                                                <TableRow
                                                    key={sale.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.get(route('sales.show', sale.id))}
                                                >
                                                    <TableCell className="font-medium">#{sale.id}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{formattedDate.date}</div>
                                                        <div className="text-xs text-muted-foreground">{formattedDate.time}</div>
                                                    </TableCell>
                                                    <TableCell>{sale.user?.name}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        ₱{sale.total_amount.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                    <ShoppingCart className="h-8 w-8 text-gray-300 mb-2" />
                                                    <p>No sales found for this branch.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4 p-4">
                            {sales.data.length > 0 ? (
                                sales.data.map((sale) => {
                                    const formattedDate = formatDate(sale.created_at);

                                    return (
                                        <div
                                            key={sale.id}
                                            className="border rounded-xl p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors shadow-sm"
                                            onClick={() => router.get(route('sales.show', sale.id))}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="font-mono">
                                                    Sale #{sale.id}
                                                </Badge>
                                                <span className="font-bold text-primary">₱{sale.total_amount.toFixed(2)}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{formattedDate.date}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">
                                                        {formattedDate.time}
                                                    </span>
                                                </div>
                                            </div>

                                            {sale.user && (
                                                <div className="flex items-center gap-1.5 text-sm pt-1 border-t">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">
                                                        Recorded by: <span className="font-medium text-foreground">{sale.user.name}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                    <ShoppingCart className="h-10 w-10 text-gray-300 mb-3" />
                                    <p className="font-medium">No sales found</p>
                                    <p className="text-sm mt-1">
                                        {currentBranch
                                            ? `No sales have been recorded for ${currentBranch.name}`
                                            : 'No sales have been recorded yet'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {sales.last_page > 1 && (
                            <div className="px-4 sm:px-6 py-4 border-t flex items-center justify-between">
                                <div className="text-sm text-muted-foreground hidden sm:block">
                                    Showing {sales.from}-{sales.to} of {sales.total} transactions
                                </div>
                                <Pagination
                                    className="mx-auto sm:mx-0"
                                    links={sales.links}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
