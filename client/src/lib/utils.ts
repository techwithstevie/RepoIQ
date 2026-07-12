import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function repoSlugFromUrl(url: string): string {
    const clean = url.replace(/\.git$/, '').replace(/\/$/, '');
    const parts = clean.split('/');
    return `${parts[parts.length - 2]}__${parts[parts.length - 1]}`;
}

export function displaySlug(slug: string): string {
    return slug.replace('__', '/');
}

export function generateId(): string {
    return Math.random().toString(36).slice(2, 11);
}