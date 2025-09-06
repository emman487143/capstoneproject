import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MinusCircle, Receipt, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Sale, type SaleItem } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CartItemModification {
    type: 'remove';
    inventory_item_id: number;
    name: string;
    [key: string]: string | number | boolean | null | undefined;
}

// Extend SaleItem interface to include modifications if it's not already defined this way
interface ExtendedSaleItem extends SaleItem {
    modifications?: CartItemModification[][]; // Array of modifications for each instance
}

interface ShowProps {
    sale: Sale & {
        items: ExtendedSaleItem[];
    };
}

export default function Show({ sale }: ShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales Log', href: route('sales.index') },
        { title: `Sale #${sale.id}` },
    ];

    // Format date nicely
    const formattedDate = format(new Date(sale.created_at), 'PPP p');

    // Helper function to render modifications
    const renderModifications = (item: ExtendedSaleItem) => {
        if (!item.modifications || item.modifications.length === 0) {
            return null;
        }

        // Count modifications by name for display
        const modificationCounts: Record<string, number> = {};

        // Flatten all modifications and count occurrences
        item.modifications.forEach(instanceMods => {
            instanceMods.forEach(mod => {
                if (mod.type === 'remove') {
                    modificationCounts[`No ${mod.name}`] = (modificationCounts[`No ${mod.name}`] || 0) + 1;
                }
            });
        });

        // Format for display
        return (
            <div className="mt-1 text-xs text-muted-foreground">
                {Object.entries(modificationCounts).map(([modification, count], index) => (
                    <div key={index} className="flex items-center">
                        <MinusCircle className="h-3 w-3 mr-1 text-destructive" />
                        <span>
                            {modification} {count > 1 && `(${count}×)`}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sale #${sale.id}`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                            Sale #{sale.id}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Recorded on {formattedDate}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <Badge className="text-sm sm:text-base bg-green-500 text-green-950 hover:bg-green-500/80 px-3 py-1 rounded-xl">
                            Completed
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Sale Info Card */}
                    <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden">
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="text-base sm:text-lg">Sale Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Branch</h3>
                                <p className="font-medium">{sale.branch?.name}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Recorded By</h3>
                                <p className="font-medium">{sale.user?.name}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
                                <p className="font-medium">{formattedDate}</p>
                            </div>
                            {sale.notes && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                                    <p className="whitespace-pre-wrap text-sm">{sale.notes}</p>
                                </div>
                            )}

                            <div className="pt-4">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full rounded-xl px-4 py-2 shadow-sm"
                                >
                                    <Link href={route('sales.index')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Sales
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Table Card */}
                    <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden lg:col-span-2">
                        <CardHeader className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    Sale Items
                                </CardTitle>
                                <Badge variant="outline" className="self-start sm:self-auto px-3 py-1 rounded-xl shadow-sm">
                                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <CardDescription className="mt-1.5">
                                Products sold in this transaction
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop Table View */}
                            <div className="hidden md:block px-4 sm:px-6 pb-6">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[40%]">Product</TableHead>
                                                <TableHead className="text-center">Quantity</TableHead>
                                                <TableHead className="text-right">Price at Sale</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sale.items.map((item: ExtendedSaleItem) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.product.name}</div>
                                                        {renderModifications(item)}
                                                    </TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        ₱{item.price_at_sale.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ₱{(item.price_at_sale * item.quantity).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-bold text-base sm:text-lg">
                                                    Total
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-base sm:text-lg">
                                                    ₱{sale.total_amount.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4 p-4 sm:p-6">
                                {sale.items.map((item: ExtendedSaleItem) => (
                                    <div key={item.id} className="border rounded-xl p-3 sm:p-4 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="font-medium">{item.product.name}</h3>
                                                {renderModifications(item)}
                                            </div>
                                            <Badge variant="outline" className="ml-2 px-2.5 py-0.5 rounded-xl">
                                                {item.quantity > 1 ? `${item.quantity}×` : '1×'}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Price</p>
                                                <p>₱{item.price_at_sale.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground">Subtotal</p>
                                                <p className="font-semibold">₱{(item.price_at_sale * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t mt-6 pt-4 flex justify-between items-center">
                                    <span className="font-semibold text-base sm:text-lg">Total</span>
                                    <span className="font-bold text-base sm:text-lg">₱{sale.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
