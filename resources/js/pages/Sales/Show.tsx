import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Receipt, ShoppingBag } from 'lucide-react';
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

interface ShowProps {
    sale: Sale;
}

export default function Show({ sale }: ShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sales Log', href: route('sales.index') },
        { title: `Sale #${sale.id}` },
    ];

    // Format date nicely
    const formattedDate = format(new Date(sale.created_at), 'PPP p');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sale #${sale.id}`} />

            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                            Sale #{sale.id}
                        </h1>
                        <p className="text-muted-foreground">
                            Recorded on {formattedDate}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        <Badge className="text-base bg-green-500 text-green-950 hover:bg-green-500/80">
                            Completed
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sale Info Card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">Sale Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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

                            <div className="pt-2">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={route('sales.index')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to Sales
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Table Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    Sale Items
                                </CardTitle>
                                <Badge variant="outline">
                                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <CardDescription>
                                Products sold in this transaction
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-center">Quantity</TableHead>
                                            <TableHead className="text-right">Price at Sale</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.items.map((item: SaleItem) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product.name}</TableCell>
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
                                            <TableCell colSpan={3} className="text-right font-bold text-lg">
                                                Total
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                ₱{sale.total_amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {sale.items.map((item: SaleItem) => (
                                    <div key={item.id} className="border rounded-md p-3">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium">{item.product.name}</h3>
                                            <Badge variant="outline" className="ml-2">
                                                {item.quantity > 1 ? `${item.quantity}x` : '1x'}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
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
                                    <span className="text-lg font-semibold">Total</span>
                                    <span className="text-lg font-bold">₱{sale.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
