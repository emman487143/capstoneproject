import { useState, useEffect } from 'react';

/**
 * A custom React hook that debounces a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds. Defaults to 500ms.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set a timer to update the debounced value after the specified delay.
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay || 500);

        // Cleanup function: clear the timer if the value changes before the delay has passed.
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]); // Only re-run the effect if the value or delay changes.

    return debouncedValue;
}
