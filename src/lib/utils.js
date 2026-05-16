import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function absoluteUrl(path) {
    if (typeof window === 'undefined')
        return path;
    return `${window.location.origin}${path}`;
}
