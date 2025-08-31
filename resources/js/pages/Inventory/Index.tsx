import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useDebouncedCallback } from 'use-debounce';
import {
    AlertTriangle,
    Clock,
    MoreHorizontal,
    PackagePlus,
    RefreshCw,
    Search,
    View,
    MinusCircle,
    List,
    X,
    PackageX,
} from 'lucide-react';

import {
    Branch,
    BreadcrumbItem,
    InventoryItem as InventoryItemType,
    PageProps as PagePropsType,
    Paginator,
    InventoryCategory,
    Auth,
} from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Pagination from '@/components/pagination';
import { cn, formatCurrency } from '@/lib/utils';
import BranchSwitcher from '@/components/branch-switcher';

type InventoryItemProps = InventoryItemType & {
    current_stock: number;
    status: string; // Changed from enum to string to accommodate batch info
    is_expiring_soon: boolean;
    expiring_batch?: { // Added new structure
        batch_number: string;
        expiration_date: string;
    } | null;
    total_value: number;
};
type StatusFilter = 'low_stock' | 'out_of_stock' | 'expiring_soon';

interface IndexPageProps extends PagePropsType {
    auth: Auth;
    items: Paginator<InventoryItemProps>;
    branches: Branch[];
    currentBranch: Branch | null;
    categories: InventoryCategory[];
    filters: {
        search?: string;
        branch?: string;
        category?: string;
        status?: string;
    };
    stats: {
        lowStockCount: number;
        expiringSoonCount: number;
        outOfStockCount: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inventory', href: route('inventory.index') }];

export default function Index({
    auth,
    items,
    branches,
    currentBranch,
    categories,
    filters,
    stats,
}: IndexPageProps) {
    const [activeFilters, setActiveFilters] = useState({
        search: filters.search || '',
        category: filters.category || '',
        status: filters.status || '',
    });

    useEffect(() => {
        setActiveFilters({
            search: filters.search || '',
            category: filters.category || '',
            status: filters.status || '',
        });
    }, [filters]);

    const applyFilters = useDebouncedCallback((newFilters) => {
        const query: Record<string, string | number | undefined> = { ...newFilters };
        Object.keys(query).forEach((key) => {
            if (!query[key]) {
                delete query[key];
            }
        });

        router.get(route('inventory.index', { branch: currentBranch?.id }), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, 300);

    const handleFilterChange = (key: keyof typeof activeFilters, value: string) => {
        const newFilters = { ...activeFilters, [key]: value };
        setActiveFilters(newFilters);
        applyFilters(newFilters);
    };



    const handleStatusButtonClick = (status: StatusFilter) => {
        const newStatus = activeFilters.status === status ? '' : status;
        handleFilterChange('status', newStatus);
    };

    const handleSearch = (term: string) => {
        handleFilterChange('search', term);
    };

    const handleRefresh = () => {
        router.get(
            route('inventory.index', { branch: currentBranch?.id, ...activeFilters }),
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleBranchChange = (branchId: string) => {
        router.get(route('inventory.index'), { branch: branchId, ...activeFilters }, { preserveState: true, replace: true });
    };

   const renderStatusBadge = (item: InventoryItemProps) => {
    if (item.status.includes('Expiring Soon')) {
        return (
            <Badge variant="warning" className="bg-orange-500 text-white hover:bg-orange-600">
                {item.status}
            </Badge>
        );
    }

        return (
        <Badge
            variant={
                item.status === 'Out of Stock'
                    ? 'destructive'
                    : item.status === 'Low Stock'
                    ? 'destructive'
                    : 'default'
            }
        >
            {item.status}
        </Badge>
    );
    };

    // Count out of stock items from the paginated items (current page only)
    const outOfStockCount = items.data.filter(item => item.status === 'Out of Stock').length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Overview" />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inventory Overview</h1>
                        <p className="text-muted-foreground">
                            Manage stock levels for{' '}
                            <span className="font-semibold text-primary">
                                {currentBranch?.name ?? 'All Branches'}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        {currentBranch && (
                            <Button asChild>
                                <Link
                                    href={route('inventory.adjustments.create', {
                                        branch_id: currentBranch.id,
                                    })}
                                >
                                    <MinusCircle className="mr-2 h-4 w-4" />
                                    Record Adjustment
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

               <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 gap-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Low Stock</p>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
                            <p className="text-xs text-muted-foreground">Items below threshold</p>
                        </div>
                    </Card>
                    <Card className="p-4 gap-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Expiring Soon</p>
                            <Clock className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-orange-500">{stats.expiringSoonCount}</div>
                            <p className="text-xs text-muted-foreground">Expires within 7 days</p>
                        </div>
                    </Card>
                    <Card className="p-4 gap-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Out of Stock</p>
                            <PackageX className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-500">{stats.outOfStockCount}</div>
                            <p className="text-xs text-muted-foreground">Items with zero inventory</p>
                        </div>
                    </Card>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 mb-4">
                            <div className="grid grid-cols-1 sm:flex sm:flex-row items-center gap-4">
                                <div className="relative w-full sm:max-w-xs">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search inventory..."
                                        className="pl-8 w-full"
                                        value={activeFilters.search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>
                                {auth.user.is_admin && (
                                    <BranchSwitcher
                                        branches={branches}
                                        currentBranch={currentBranch}
                                        className="w-full sm:w-auto"
                                        onBranchChange={handleBranchChange}
                                    />
                                )}
                                <Select
                                    value={activeFilters.category}
                                    onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant={activeFilters.status === 'low_stock' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusButtonClick('low_stock')}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Low Stock
                                </Button>
                                <Button
                                    variant={activeFilters.status === 'out_of_stock' ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusButtonClick('out_of_stock')}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Out of Stock
                                </Button>
                                <Button
                                    variant={activeFilters.status === 'expiring_soon' ? 'secondary' : 'outline'}
                                    className={cn(
                                        activeFilters.status === 'expiring_soon' &&
                                            'bg-orange-500 text-white hover:bg-orange-600',
                                    )}
                                    size="sm"
                                    onClick={() => handleStatusButtonClick('expiring_soon')}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Expiring Soon
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-md border hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Current Stock</TableHead>
                                        <TableHead>Total Value</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.data.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.category?.name ?? 'N/A'}</TableCell>
                                            <TableCell>{item.current_stock} {item.unit}</TableCell>
                                            <TableCell>{formatCurrency(item.total_value)}</TableCell>
                                            <TableCell>{renderStatusBadge(item)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={route('inventory.items.batches.index', { item: item.id, branch: currentBranch?.id })}>
                                                                <View className="mr-2 h-4 w-4" />
                                                                View Batches
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={route('inventory.batches.create', { item_id: item.id, branch_id: currentBranch?.id })}>
                                                                <PackagePlus className="mr-2 h-4 w-4" />
                                                                Add Batch
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {items.data.length > 0 ? (
                                items.data.map((item) => (
                                    <div key={item.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Category: {item.category?.name ?? 'N/A'}
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('inventory.items.batches.index', { item: item.id, branch: currentBranch?.id })}>
                                                            <List className="mr-2 h-4 w-4" />
                                                            View Batches
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('inventory.batches.create', { item_id: item.id, branch_id: currentBranch?.id })}>
                                                            <PackagePlus className="mr-2 h-4 w-4" />
                                                            Add Batch
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="mt-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status</span>
                                                {renderStatusBadge(item)}
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Stock</span>
                                                <span className="font-semibold">{item.current_stock} {item.unit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total Value</span>
                                                <span className="font-semibold">{formatCurrency(item.total_value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    No items found.
                                </div>
                            )}
                        </div>

                        {items.last_page > 1 && (
    <div className="mt-6 flex justify-center">
        <Pagination links={items.links} />
    </div>
)}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
