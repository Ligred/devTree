'use client';

import type { Page } from './types';

type PageTitleProps = Readonly<{
  page: Page;
  readOnly?: boolean;
  onTitleChange?: (title: string) => void;
  /** Called when the title input loses focus — used to persist the title. */
  onTitleBlur?: () => void;
  invalid?: boolean;
}>;

export function PageTitle({
  page,
  readOnly = true,
  onTitleChange,
  onTitleBlur,
  invalid = false,
}: PageTitleProps) {
  if (readOnly) {
    // Read-only mode: render as a plain heading — not interactive at all.
    return (
      <h1 className="text-foreground w-full cursor-default p-0 text-3xl font-bold select-text">
        {page.title || <span className="text-muted-foreground">Untitled</span>}
      </h1>
    );
  }

  return (
    <input
      type="text"
      value={page.title}
      readOnly={false}
      onChange={(e) => onTitleChange?.(e.target.value)}
      onBlur={onTitleBlur}
      aria-label="Page title"
      aria-invalid={invalid}
      className={
        invalid
          ? 'border-destructive text-foreground placeholder-muted-foreground focus:ring-destructive/20 w-full rounded border bg-transparent p-0.5 text-3xl font-bold focus:ring-1 focus:outline-none'
          : 'text-foreground placeholder-muted-foreground w-full border-none bg-transparent p-0 text-3xl font-bold focus:ring-0 focus:outline-none'
      }
      placeholder="Page title..."
    />
  );
}
