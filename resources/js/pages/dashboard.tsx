import AppLayout from '@/layouts/app-layout';
import { type PageProps, type BreadcrumbItem, Branch } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    AlertTriangle, BadgeDollarSign, History, PackageX, ShoppingCart, ArrowUpDown,
    Package, Activity, Calendar, CreditCard, TrendingUp, Flame, ArrowUpRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Heading from '@/components/heading';
import BranchSwitcher from '@/components/branch-switcher';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Update the DashboardStats interface
interface DashboardStats {
    lowStockCount: number;
    expiringSoonCount: number;
    salesTodayCount: number;
    outOfStockCount: number;
    inventoryValue: number;
    inventoryHealthScore: number;
}

// This would be defined in your types file and passed from the controller
interface ActivityDetails {
    title: string;
    description: string;
    quantityInfo: string;
    reason?: string;
    metadata?: Array<{label: string; value: string}>;
}

interface ActivityLog {
    id: number;
    type: 'inventory' | 'sale' | 'transfer';
    action: string;
    details: ActivityDetails;
    created_at: string;
    user: { name: string } | null;
    status?: string;
}

// Add new interfaces for the additional data types
interface BestSellerProduct {
    id: number;
    name: string;
    quantity: number;
    total: number;
}

interface SalesDataPoint {
    date: string;
    value: number;
}

interface LowStockItem {
    id: number;
    name: string;
    current_stock: number;
    threshold: number;
    unit: string;
}

interface ExpiringSoonItem {
    id: number;
    batch_id: number;
    name: string;
    expiration_date: string;
    remaining: number;
    unit: string;
    days_left: number;
}

// Update the PageProps interface
interface DashboardPageProps extends PageProps {
    stats: DashboardStats;
    recentInventoryLogs: ActivityLog[];
    recentSale: ActivityLog | null;
    recentTransfer: ActivityLog | null;
    branches: Branch[];
    currentBranch: Branch | null;
    salesData: {
        daily: SalesDataPoint[];
        weekly: SalesDataPoint[];
        monthly: SalesDataPoint[];
    };
    bestSellerProducts: BestSellerProduct[];
    bestSellerAddons: BestSellerProduct[];
    lowStockItems: LowStockItem[];
    expiringSoonItems: ExpiringSoonItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: route('dashboard'),
    },
];

const actionBadges: Record<string, string> = {
    deducted_for_sale: 'bg-green-500',
    transfer_out: 'bg-yellow-500 text-black',
    transfer_in: 'bg-yellow-400 text-black',
    batch_created: 'bg-blue-500',
    adjustment_waste: 'bg-red-500',
};

const defaultStats: DashboardStats = {
    lowStockCount: 0,
    expiringSoonCount: 0,
    salesTodayCount: 0,
    outOfStockCount: 0,
    inventoryValue: 0,
    inventoryHealthScore: 0,
};

// Format currency values
const formatCurrency = (value: number): string => {
    return '₱' + value.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Custom tooltip for the bar chart
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border p-2 shadow-sm rounded-md">
                <p className="font-medium">{label}</p>
                <p className="text-primary">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

export default function Dashboard({
    auth,
    stats = defaultStats,
    recentInventoryLogs = [],
    recentSale = null,
    recentTransfer = null,
    branches,
    currentBranch,
    salesData = { daily: [], weekly: [], monthly: [] },
    bestSellerProducts = [],
    bestSellerAddons = [],
    lowStockItems = [],
    expiringSoonItems = [],
}: DashboardPageProps) {
    const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [stockTab, setStockTab] = useState<'low' | 'expiring'>('low');

    const handleBranchChange = (branchId: string) => {
        router.get(route('dashboard'), { branch: branchId }, { preserveState: true, replace: true });
    };

    // Get appropriate badge color for different activities
    const getActionBadgeClass = (type: string, action: string) => {
        if (type === 'sale') return 'bg-green-500';
        if (type === 'transfer') {
            return action === 'transfer_out' ? 'bg-yellow-500 text-black' : 'bg-yellow-400 text-black';
        }
        return actionBadges[action] || 'bg-gray-500';
    };

    // Get the current sales data based on the selected period
    const currentSalesData = salesData[salesPeriod] || [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                    <Heading
                        title="Dashboard"
                        description={
                            currentBranch
                                ? `Showing key metrics for ${currentBranch.name}.`
                                : 'Overview of system activity.'
                        }
                    />
                    {auth.user.is_admin && branches.length > 1 && (
                        <BranchSwitcher
                            branches={branches}
                            currentBranch={currentBranch}
                            onBranchChange={handleBranchChange}
                        />
                    )}
                </div>

                {/* Stat Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href={route('inventory.index', { branch: currentBranch?.id, filter: 'low_stock' })}>
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
                                <p className="text-xs text-muted-foreground">Items below threshold</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('sales.index', { branch: currentBranch?.id, filter: 'today' })}>
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
                                <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.salesTodayCount}</div>
                                <p className="text-xs text-muted-foreground">Total sales recorded today</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('inventory.index', { branch: currentBranch?.id, filter: 'expiring_soon' })}>
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                                <History className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-500">{stats.expiringSoonCount}</div>
                                <p className="text-xs text-muted-foreground">Batches nearing expiration</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('inventory.index', { branch: currentBranch?.id, filter: 'out_of_stock' })}>
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                                <PackageX className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-500">{stats.outOfStockCount}</div>
                                <p className="text-xs text-muted-foreground">Items with zero inventory</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Sales Chart and Best Sellers Section */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Sales Chart Card */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Sales Overview</CardTitle>
                                <CardDescription>Performance trends over time</CardDescription>
                            </div>
                            <Select value={salesPeriod} onValueChange={(value) => setSalesPeriod(value as any)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="daily">
                                            <div className="flex items-center">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span>Daily</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="weekly">
                                            <div className="flex items-center">
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                <span>Weekly</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="monthly">
                                            <div className="flex items-center">
                                                <TrendingUp className="mr-2 h-4 w-4" />
                                                <span>Monthly</span>
                                            </div>
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="px-2">
                            <div className="h-[300px] mt-2">
                                {currentSalesData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={currentSalesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 12 }}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tickFormatter={(value) => `₱${value}`}
                                                tick={{ fontSize: 12 }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={60}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-muted-foreground">No sales data available</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Best Sellers Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Best Sellers</CardTitle>
                            <CardDescription>Top performing items in the last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent className="px-2">
                            <Tabs defaultValue="products">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="products">Main Items</TabsTrigger>
                                    <TabsTrigger value="addons">Add-ons</TabsTrigger>
                                </TabsList>

                                <TabsContent value="products" className="mt-0 space-y-4">
                                    {bestSellerProducts.length > 0 ? (
                                        bestSellerProducts.map((product, index) => (
                                            <div key={product.id} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center text-white",
                                                        index === 0 ? "bg-amber-400" :
                                                        index === 1 ? "bg-slate-400" :
                                                        index === 2 ? "bg-amber-700" : "bg-muted"
                                                    )}>
                                                        <span className="font-bold">{index + 1}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">{product.quantity} orders</p>
                                                    </div>
                                                </div>
                                                <p className="font-medium">{formatCurrency(product.total)}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-32">
                                            <p className="text-muted-foreground">No sales data available</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="addons" className="mt-0 space-y-4">
                                    {bestSellerAddons.length > 0 ? (
                                        bestSellerAddons.map((addon, index) => (
                                            <div key={addon.id} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center text-white",
                                                        index === 0 ? "bg-amber-400" :
                                                        index === 1 ? "bg-slate-400" :
                                                        index === 2 ? "bg-amber-700" : "bg-muted"
                                                    )}>
                                                        <span className="font-bold">{index + 1}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{addon.name}</p>
                                                        <p className="text-xs text-muted-foreground">{addon.quantity} orders</p>
                                                    </div>
                                                </div>
                                                <p className="font-medium">{formatCurrency(addon.total)}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-32">
                                            <p className="text-muted-foreground">No add-on sales data</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Stock Status Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Stock Status</CardTitle>
                            <Tabs value={stockTab} onValueChange={(value) => setStockTab(value as any)} className="w-[400px]">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="low">
                                        <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                                        Low Stock Items
                                    </TabsTrigger>
                                    <TabsTrigger value="expiring">
                                        <History className="mr-2 h-4 w-4 text-orange-500" />
                                        Expiring Soon
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stockTab === 'low' ? (
                            <div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Current Stock</TableHead>
                                            <TableHead>Threshold</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lowStockItems.length > 0 ? (
                                            lowStockItems.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>
                                                        {item.current_stock} {item.unit}
                                                    </TableCell>
                                                    <TableCell>{item.threshold} {item.unit}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="destructive">Low Stock</Badge>

                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No low stock items.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                {lowStockItems.length > 0 && stats.lowStockCount > lowStockItems.length && (
                                    <div className="mt-4 text-center">
                                        <Link
                                            href={route('inventory.index', { branch: currentBranch?.id, filter: 'low_stock' })}
                                            className="text-sm text-primary hover:underline inline-flex items-center"
                                        >
                                            View all {stats.lowStockCount} low stock items
                                            <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Batch</TableHead>
                                            <TableHead>Expiration</TableHead>
                                            <TableHead>Remaining</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expiringSoonItems.length > 0 ? (
                                            expiringSoonItems.map(item => (
                                                <TableRow key={`${item.id}-${item.batch_id}`}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>#{item.batch_id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{new Date(item.expiration_date).toLocaleDateString()}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.days_left} day{item.days_left !== 1 ? 's' : ''} left
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.remaining} {item.unit}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                item.days_left <= 3
                                                                    ? 'bg-destructive hover:bg-destructive/80'
                                                                    : 'bg-orange-500 hover:bg-orange-600'
                                                            )}
                                                        >
                                                            Expires {item.days_left <= 1 ? 'Soon' : `in ${item.days_left} days`}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    No items expiring soon.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                {expiringSoonItems.length > 0 && stats.expiringSoonCount > expiringSoonItems.length && (
                                    <div className="mt-4 text-center">
                                        <Link
                                            href={route('inventory.index', { branch: currentBranch?.id, filter: 'expiring_soon' })}
                                            className="text-sm text-primary hover:underline inline-flex items-center"
                                        >
                                            View all {stats.expiringSoonCount} expiring items
                                            <ArrowUpRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Inventory Logs */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Inventory Activity</CardTitle>
                            <Package className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>User</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentInventoryLogs.length > 0 ? (
                                        recentInventoryLogs.map((log) => (
                                            <TableRow key={`inventory-${log.id}`}>
                                                <TableCell>
                                                    <Badge className={cn('text-white', getActionBadgeClass(log.type, log.action))}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="font-medium">{log.details.title}</div>
                                                    <div className="text-sm text-muted-foreground">{log.details.description}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div>{log.user?.name ?? 'System'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                No recent inventory activity.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="mt-4">
                                <Link
                                    href={route('inventory.logs.index', { branch: currentBranch?.id })}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View all inventory logs →
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales and Transfers Column */}
                    <div className="space-y-4">
                        {/* Sales Card */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Recent Sale</CardTitle>
                                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {recentSale ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Badge className="bg-green-500 text-white">
                                                {recentSale.details.title}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(recentSale.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="font-medium">{recentSale.details.description}</div>
                                        <div className="text-sm">{recentSale.details.quantityInfo}</div>
                                        <div className="text-xs text-muted-foreground">
                                            By: {recentSale.user?.name ?? 'System'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-3 text-center text-muted-foreground">
                                        No recent sales.
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Link
                                        href={route('sales.index', { branch: currentBranch?.id })}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View all sales →
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transfers Card */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Recent Transfer</CardTitle>
                                <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {recentTransfer ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Badge className={cn('text-white',
                                                recentTransfer.action === 'transfer_out'
                                                    ? 'bg-yellow-500 text-black'
                                                    : 'bg-yellow-400 text-black'
                                            )}>
                                                {recentTransfer.details.title}
                                            </Badge>
                                            <Badge variant={recentTransfer.status === 'completed'
                                                ? 'success'
                                                : recentTransfer.status === 'cancelled'
                                                    ? 'destructive'
                                                    : 'outline'
                                            }>
                                                {recentTransfer.status}
                                            </Badge>
                                        </div>
                                        <div className="font-medium">{recentTransfer.details.description}</div>
                                        <div className="text-sm">{recentTransfer.details.quantityInfo}</div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-muted-foreground">
                                                By: {recentTransfer.user?.name ?? 'System'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(recentTransfer.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-3 text-center text-muted-foreground">
                                        No recent transfers.
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Link
                                        href={route('inventory.transfers.index', { branch: currentBranch?.id })}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View all transfers →
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
