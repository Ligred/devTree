'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTextTruncation } from '@/lib/utils';

interface TruncatedTextProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

/**
 * TruncatedText — wraps text that may be visually truncated with a tooltip.
 *
 * Automatically detects truncation and shows a tooltip with the full text.
 * Only shows tooltip if text is actually truncated (scrollWidth > clientWidth).
 *
 * Usage:
 *   <TruncatedText className="truncate">
 *     Very long folder name that might overflow
 *   </TruncatedText>
 */
export const TruncatedText = React.forwardRef<
  HTMLDivElement,
  TruncatedTextProps
>(
  (
    {
      children,
      className,
      tooltipSide = 'top',
      delayDuration = 200,
      ...props
    },
    ref
  ) => {
    const elementRef = React.useRef<HTMLDivElement>(null);
    const isTruncated = useTextTruncation(elementRef);

    React.useImperativeHandle(ref, () => elementRef.current as HTMLDivElement);

    if (!isTruncated) {
      return (
        <div ref={elementRef} className={className} {...props}>
          {children}
        </div>
      );
    }

    return (
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          <div ref={elementRef} className={className} {...props}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    );
  }
);

TruncatedText.displayName = 'TruncatedText';
