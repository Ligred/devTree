'use client';

import type { Page } from './types';

type PageTitleProps = Readonly<{
  page: Page;
  readOnly?: boolean;
  onTitleChange?: (title: string) => void;
}>;

export function PageTitle({
  page,
  readOnly = true,
  onTitleChange,
}: PageTitleProps) {
  return (
    <input
      type="text"
      value={page.title}
      readOnly={readOnly}
      onChange={(e) => onTitleChange?.(e.target.value)}
      aria-label="Page title"
      className="w-full border-none bg-transparent p-0 text-3xl font-bold text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0"
      placeholder="Page title..."
    />
  );
}
