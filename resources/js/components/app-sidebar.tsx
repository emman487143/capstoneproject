import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
     ArrowRightLeft,
    Boxes,
    Building2,
    ClipboardList,
    ClipboardPen,
    LayoutDashboard,
    Package,
    Users,
    History,
    UtensilsCrossed, // Added for Products
} from 'lucide-react';
import AppLogo from './app-logo';
import { cn } from '@/lib/utils';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Branches',
        href: '/branches',
        icon: Building2,
    },
     {
        title: 'Employees',
        href: '/employees',
        icon: Users,
    },
];

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;

    const inventoryNavItems: NavItem[] = [
        {
            title: 'Overview',
            href: route('inventory.index'),
            icon: Package,
        },
        {
            title: 'Transfers',
            href: route('inventory.transfers.index'),
            icon: ArrowRightLeft,
        },

        ...(auth.user.is_admin
            ? [

                {
            title: 'Categories',
            href: route('inventory.categories.index'),
            icon: ClipboardList,
        },
                  {
                      title: 'Manage Items',
                      href: route('inventory.items.index'),
                      icon: Boxes,
                  },
              ]
            : []),
        {
            title: 'Inventory Log',
            href: route('inventory.logs.index'),
            icon: ClipboardList,
        },

    ];
    const productNavItems: NavItem[] = [
        {
            title: 'Manage Products',
            href: route('products.index'),
            icon: UtensilsCrossed,
        },
        {
            title: 'Categories',
            href: route('product-categories.index'),
            icon: ClipboardList,
        },
    ];
const salesNavItems: NavItem[] = [
        {
            title: 'Record Sale',
            href: route('sales.create'),
            icon: ClipboardPen,
        },
        {
            title: 'Sales Log',
            href: route('sales.index'),
            icon: History,
        },
    ];
    return (
        <Sidebar>
            <SidebarHeader>
                <AppLogo />
            </SidebarHeader>
            <SidebarContent>
                {auth.user.is_admin && (<SidebarMenu>

                    <NavMain items={mainNavItems} />
                </SidebarMenu>)}

                {/* Add the inventory menu here */}
                <SidebarMenu>
                    <SidebarMenuButton className='pointer-events-none mt-4 h-auto justify-start rounded-lg px-3 py-2 text-sm'>
                        Inventory
                    </SidebarMenuButton>
                    <NavMain items={inventoryNavItems} />
                </SidebarMenu>
                 {/* Conditionally render the Products menu for admins */}
                {auth.user.is_admin && (
                    <SidebarMenu>
                        <SidebarMenuButton className="pointer-events-none mt-4 h-auto justify-start rounded-lg px-3 py-2 text-sm">
                            Products
                        </SidebarMenuButton>
                        <NavMain items={productNavItems} />
                    </SidebarMenu>
                )}
            <SidebarMenu>
                    <SidebarMenuButton className="pointer-events-none mt-4 h-auto justify-start rounded-lg px-3 py-2 text-sm">
                        Sales
                    </SidebarMenuButton>
                    <NavMain items={salesNavItems} />
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
