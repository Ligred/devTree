/**
 * utils.ts — shared utility helpers used throughout the codebase.
 *
 * WHY such a small file?
 *   Utility functions that don't belong to a specific domain (i18n, tree, blocks)
 *   live here. Keeping them in one place prevents duplication and makes imports
 *   predictable: any component that needs `cn()` knows to import from `@/lib/utils`.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — merge Tailwind CSS class names safely.
 *
 * Two libraries work together here:
 *
 *   clsx    — accepts any combination of strings, arrays, objects, and
 *             conditionals, and concatenates the truthy class names into a
 *             single string.  Example:
 *               clsx('a', undefined, ['b', false && 'c'], { d: true })
 *               → 'a b d'
 *
 *   twMerge — resolves Tailwind conflicts by keeping only the LAST class in a
 *             conflicting group.  Without it, `cn('p-4', 'p-8')` would produce
 *             the string 'p-4 p-8' and the browser would apply whichever
 *             appears last in the stylesheet (unpredictable).  twMerge knows
 *             that both classes target the same CSS property and keeps 'p-8'.
 *
 * Usage examples:
 *   cn('rounded', isActive && 'bg-indigo-600')
 *   cn('p-4', conditional ? 'p-8' : 'p-2')   // conflict resolved → 'p-8' or 'p-2'
 *   cn(baseClass, variantClass, props.className)
 *
 * IMPROVEMENT: For highly dynamic class generation (hundreds of unique
 * combinations), consider caching twMerge via `extendTailwindMerge()` with
 * your Tailwind config to avoid re-parsing the class list on every call.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
