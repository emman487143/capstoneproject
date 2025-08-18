import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PHP',
    }).format(number);
}
