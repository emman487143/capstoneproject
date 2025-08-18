import React from 'react';
import { Head, router } from '@inertiajs/react';

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Branch, type PaginatedResponse, type Sale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import Pagination from '@/components/pagination'; // Corrected: Default import
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface IndexProps {
    sales: PaginatedResponse<Sale>; // Corrected: Use existing PaginatedResponse type
    branches: Branch[];
    currentBranch: Branch | null;
    filters: { branch: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Log', href: route('sales.index') }];

export default function Index({ sales, branches, currentBranch, filters }: IndexProps) {
    const handleBranchChange = (branchId: string) => {
        router.get(route('sales.index'), { branch: branchId }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Log" />
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Sales History</CardTitle>
                        {branches.length > 1 && (
                            <Select
                                value={currentBranch?.id.toString()}
                                onValueChange={handleBranchChange}
                            >
                                <SelectTrigger className="w-[180px]">
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
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sale ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.data.length > 0 ? (
                                sales.data.map((sale) => (
                                    <TableRow
                                        key={sale.id}
                                        className="cursor-pointer"
                                        onClick={() => router.get(route('sales.show', sale.id))}
                                    >
                                        <TableCell>#{sale.id}</TableCell>
                                        <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{sale.user?.name}</TableCell>
                                        <TableCell className="text-right">
                                            ₱{sale.total_amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">
                                        No sales found for this branch.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                       {sales.last_page > 1 && (
                        <Pagination className="mt-4" links={sales.links} />
                    )}
                </CardContent>
            </Card>
        </AppLayout>
    );
}
