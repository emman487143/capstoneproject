import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

// --- CORE & AUTH TYPES ---

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string;
    role: 'owner' | 'manager' | 'staff';
    is_admin: boolean; // Add this to align with backend logic
    created_at: string;
    updated_at: string;
    employee?: Employee;
}

export interface Auth {
    user: User;
}

export type AdjustmentType = 'Spoilage' | 'Waste' | 'Theft' | 'Damaged' | 'Missing' | 'Expired' | 'Staff Meal' | 'Other';
// --- SHARED UI & PAGE PROPS ---

export interface BreadcrumbItem {
    title: string;
    href?: string;
}

export interface NavItem {
    title:string;
    href: string;
    icon?: LucideIcon;
    isActive?: boolean;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

// This is the main shared data type for all pages.
export interface SharedData {
    auth: Auth;
    ziggy: Config & { location: string };
    flash: {
        success?: string;
        error?: string;
    };
    // Retaining your custom shared properties
    name: string;
    quote: { message: string; author: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}
export type PageProps<T = {}> = T & {
    auth: Auth;
    errors: Record<string, string>;
};
// Generic interface for Laravel's paginated responses
export interface PaginatedResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

export interface Paginator<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

// --- DOMAIN-SPECIFIC TYPES (Aligned with System Blueprint) ---

export interface Branch {
    id: number;
    name: string;
    code: string;
    address: string;
    phone_number: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export type Employee = {
    id: number;
    user_id: number | null;
    branch_id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    job_title: string;
    contact_number: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    user?: User;
    branch?: Branch;
};

export interface Category {
    id: number;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

// --- INVENTORY MANAGEMENT ---

export interface InventoryCategory {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    code: string;
    description: string | null;
    unit: string;
    tracking_type: 'by_measure' | 'by_portion';
    inventory_category_id: number;
    category?: Category; // Optional relation
    total_stock: number; // Aggregated from batches
    current_stock: number; // Added from controller accessor
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'; // Added from controller accessor
    days_to_warn_before_expiry: number | null; // Added from controller accessor
    created_at: string;
    updated_at: string;
}

export interface InventoryBatch {
    id: number;
    inventory_item_id: number;
    branch_id: number;
    batch_number: number;
    label: string; // Added this line
    source?: string;
    unit_cost?: number;
    quantity_received: number;
    current_quantity: number;
    remaining_quantity: number; // Derived property
    manufacturing_date?: string;
    expiration_date?: string;
    notes?: string;
    received_at: string;
    created_at: string;
    updated_at: string;
    inventory_item: InventoryItem;
    branch: Branch;
    portions?: InventoryBatchPortion[]; // Optional relation
    negative_adjustments?: InventoryLog[];
}

// This is a base type for the item form data
export interface ItemFormData {
    name: string;
    code: string;
    description: string;
    unit: string;
    inventory_category_id: number | string;
    tracking_type: 'by_measure' | 'by_portion';
    days_to_warn_before_expiry: number | null; // Added from controller accessor
    [key: string]: any; // Allow for additional properties
}

export interface InventoryBatchPortion {
    id: number;
    inventory_batch_id: number;
    current_branch_id: number;
    label: string;
    quantity: number; // ADDED: This was missing
    // CORRECTED: Removed 'adjusted' to align with blueprint and avoid ambiguity.
    status: 'unused' | 'used' | 'spoiled' | 'wasted' | 'transferred';
    created_at: string;
    updated_at: string;
    // Eager-loaded relationships
    batch: InventoryBatch;
}

// Aligned with system blueprint. Renamed from `inventory_logs` for clarity.
export interface Log {
    id: number;
    inventory_batch_id: number | null;
    batch_portion_id: number | null;
    user_id: number | null;
    action:
        | 'batch_created'
        | 'portions_created'
        | 'deducted_for_sale'
        | 'adjustment_waste'
        | 'adjustment_spoilage'
        | 'adjustment_theft'
        | 'adjustment_other'
        | 'transfer_out'
        | 'transfer_in'
        | 'transfer_cancelled'
        | 'transfer_damaged'
        | 'transfer_missing'
        | 'portion_restored';
    details: {
        reason?: string;
        [key: string]: any;
    };
    created_at: string;
    parsed_details: any;
    // Eager-loaded relationships
    user: User | null;
    portion?: InventoryBatchPortion;
    batch?: InventoryBatch;
    // Added property for formatted details from LogDetailFormatter service
    formatted_details?: {
        quantityInfo?: string;
        description?: string;
        metadata?: Array<{ label: string; value: string | number }>;
    };
}

export interface AdjustedPortion {
    id: number;
    label: string;
    status: PortionStatus;
    adjustment_date: string | null;
    adjustment_reason: string;
    adjustment_type: string | null;
    log_id: number | null;
}
export interface ProductCategory {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    products_count?: number;
}

export interface Product {
    id: number;
    name: string;
    description: string | null;
    price: string;
    image_path: string | null;
    image_url: string | null;
    product_category_id: number | null;
    is_addon: boolean;
    is_active: boolean;
    category?: ProductCategory;
    ingredients?: (InventoryItem & { pivot: { quantity_required: number } })[];
    branches?: (Branch & { pivot: { is_available: boolean } })[];
}

export interface SaleItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_sale: number;
    product: Product;
}

export interface Sale {
    id: number;
    branch_id: number;
    user_id: number;
    status: 'pending' | 'completed' | 'failed';
    total_amount: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user?: User;
    branch?: Branch;
    items: SaleItem[];
}

// Represents a single portion available for transfer (from API)
export interface Portion {
    id: number;
    label: string;
}

// Represents a single batch available for transfer (from API)
export interface TransferBatch {
    id: number;
    batch_number: string;
    expiration_date: string | null;
    remaining_quantity: number;
    portions: Portion[];
}

// Represents a full inventory item available for transfer (from API)
export interface AvailableItem {
    id: number;
    name: string;
    tracking_type: 'by_measure' | 'by_portion';
    unit: string;
    available_stock: number;
    batches: TransferBatch[];
}

// Represents an item added to the transfer list (the "cart")
// This is the structure that will be sent to the backend.
export type CartItem = {
    inventory_item_id: number;
    name: string;
    unit: string;
} & (
    | {
          tracking_type: 'by_measure';
          batches: {
              batch_id: number;
              quantity: number;
              batch_number: number;
              available: number;
          }[];
      }
    | {
          tracking_type: 'by_portion';
          // CORRECTED: Added portion_ids and portion_labels for portion-tracked items.
          portion_ids: number[];
          portion_labels: string[];
          // Batches array is still needed for display consistency in the cart.
          batches: {
              batch_id: number;
              quantity: number;
              batch_number: number;
              available: number;
          }[];
      }
);
// Defines the shape of the main transfer creation form
export interface TransferForm {
    // CORRECTED: Allow string for form compatibility
    source_branch_id: number | string;
    destination_branch_id: string;
    notes: string;
    items: CartItem[];
    [key: string]: any;
}
// Represents a single line item on a Transfer (for Index/Show pages)
export interface TransferItem {
    id: number;
    quantity: number;
    inventory_item: {
        id: number;
        name: string;
        unit: {
            id: number;
            name: string;
        };
    };
    inventory_batch: {
        id: number;
        batch_number: string;
        label: string;
        expiration_date: string | null;
    };
    inventory_batch_portion: {
        id: number;
        label: string;
    } | null;
    reception_status?: 'received' | 'rejected' | 'received_with_issues';
    received_quantity?: number;
    reception_notes?: string | null;
}

// Represents a full Transfer record (for Index/Show pages)
export interface Transfer {
    id: number;
    status: TransferStatus;
    notes: string | null;
    sent_at: string;
    received_at: string | null;
    created_at: string;
    source_branch: {
        id: number;
        name: string;
    };
    destination_branch: {
        id: number;
        name: string;
    };
    sending_user: {
        id: number;
        name: string;
    };
    receiving_user: {
        id: number;
        name: string;
    } | null;
    items: TransferItem[];
}
export type TransferStatus = 'pending' | 'completed' | 'cancelled' | 'rejected';
