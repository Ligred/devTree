/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Page } from '@/components/features/MainContent/types';

import { SearchResults } from './Workspace';

// we only use the translation hook for keys in this component
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('SearchResults component', () => {
  const samplePages: Page[] = [
    {
      id: 'p1',
      title: 'First page',
      tags: ['a', 'b'],
      blocks: [],
      folderId: null,
    },
    {
      id: 'p2',
      title: 'Second page',
      tags: [],
      blocks: [],
      folderId: null,
    },
  ];

  it('renders empty state when there are no results', () => {
    render(
      <SearchResults searchResults={[]} query="foo" activePageId={null} onSelect={() => {}} />,
    );

    expect(screen.getByText('sidebar.noResults')).toBeInTheDocument();
  });

  it('lists pages and highlights the active one', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchResults
        searchResults={samplePages}
        query="foo"
        activePageId="p2"
        onSelect={onSelect}
      />,
    );

    // both titles should appear
    expect(screen.getByText('First page')).toBeInTheDocument();
    expect(screen.getByText('Second page')).toBeInTheDocument();

    // active page should have the accent background class
    const secondBtn = screen.getByText('Second page').closest('button');
    expect(secondBtn).toHaveClass('bg-accent');

    // clicking a result should call onSelect with the id
    await user.click(secondBtn!);
    expect(onSelect).toHaveBeenCalledWith('p2');
  });
});
