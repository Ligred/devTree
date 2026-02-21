/**
 * utils.ts — shared utility helpers used throughout the codebase.
 *
 * WHY such a small file?
 *   Utility functions that don't belong to a specific domain (i18n, tree, blocks)
 *   live here. Keeping them in one place prevents duplication and makes imports
 *   predictable: any component that needs `cn()` knows to import from `@/lib/utils`.
 */

import { useEffect, useState } from 'react';
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

/**
 * `useTextTruncation` — hook to detect if text is visually truncated in a container.
 *
 * Compares `scrollWidth` vs `clientWidth` of a ref'd element. If scrollWidth
 * exceeds clientWidth, the text is truncated and tooltip should be shown.
 *
 * Usage:
 *   const ref = useRef(null);
 *   const isTruncated = useTextTruncation(ref);
 *
 *   return (
 *     <Tooltip delayDuration={200}>
 *       <TooltipTrigger asChild>
 *         <div ref={ref} className="truncate">{text}</div>
 *       </TooltipTrigger>
 *       {isTruncated && <TooltipContent>{text}</TooltipContent>}
 *     </Tooltip>
 *   );
 */

export function useTextTruncation(
  elementRef: React.RefObject<HTMLElement | null>
): boolean {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (elementRef.current) {
        const element = elementRef.current;
        const isTruncatedNow = element.scrollWidth > element.clientWidth;
        setIsTruncated(isTruncatedNow);
      }
    };

    checkTruncation();

    // Re-check on window resize
    window.addEventListener('resize', checkTruncation);
    // Also re-check if content changes (MutationObserver)
    const observer = new MutationObserver(checkTruncation);
    if (elementRef.current) {
      observer.observe(elementRef.current, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return () => {
      window.removeEventListener('resize', checkTruncation);
      observer.disconnect();
    };
  }, [elementRef]);

  return isTruncated;
}
