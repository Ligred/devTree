'use client';

import type { Page } from './types';

type PageTitleProps = Readonly<{
  page: Page;
  readOnly?: boolean;
  onTitleChange?: (title: string) => void;
  /** Called when the title input loses focus — used to persist the title. */
  onTitleBlur?: () => void;
}>;

export function PageTitle({
  page,
  readOnly = true,
  onTitleChange,
  onTitleBlur,
}: PageTitleProps) {
  return (
    <input
      type="text"
      value={page.title}
      readOnly={readOnly}
      onChange={(e) => onTitleChange?.(e.target.value)}
      onBlur={onTitleBlur}
      aria-label="Page title"
      className="w-full border-none bg-transparent p-0 text-3xl font-bold text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0"
      placeholder="Page title..."
    />
  );
}
