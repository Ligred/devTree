'use client';

import React from 'react';

import { cn } from '@/lib/utils';

// ─── ToolbarButton ────────────────────────────────────────────────────────────

export interface ToolbarButtonProps {
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly title?: string;
  /** optional handler executed before onClick when the button is pressed */
  readonly onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  readonly children?: React.ReactNode;
}

export const ToolbarButton = /*#__PURE__*/ React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ onClick, active, title, onMouseDown: onMouseDownProp, children }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        title={title}
        // preventDefault keeps the editor focused on mouse click.
        // The actual action fires via onClick, which also handles keyboard (Enter/Space).
        onMouseDown={(e) => {
          e.preventDefault();
          onMouseDownProp?.(e);
        }}
        onClick={onClick}
        className={cn(
          'motion-interactive flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        {children}
      </button>
    );
  },
);
