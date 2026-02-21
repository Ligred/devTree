import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { FileExplorer } from './FileExplorer';
import type { TreeDataItem } from '@/components/ui/tree-view';

const treeData: TreeDataItem[] = [
  {
    id: '1',
    name: 'Folder',
    children: [
      { id: '2', name: 'File A' },
      { id: '3', name: 'File B' },
    ],
  },
];

describe('FileExplorer', () => {
  it('renders tree with folder visible', () => {
    const onSelect = vi.fn();
    render(<FileExplorer data={treeData} onSelect={onSelect} />);
    expect(screen.getByText('Folder')).toBeInTheDocument();
  });

  it('renders children after expanding folder', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileExplorer data={treeData} onSelect={onSelect} />);
    // Expand the folder accordion
    await user.click(screen.getByText('Folder'));
    expect(screen.getByText('File A')).toBeInTheDocument();
    expect(screen.getByText('File B')).toBeInTheDocument();
  });

  it('calls onSelect when a leaf is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileExplorer data={treeData} onSelect={onSelect} />);
    // Expand folder first
    await user.click(screen.getByText('Folder'));
    await user.click(screen.getByText('File A'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', name: 'File A' }),
    );
  });

  it('renders empty tree without crashing', () => {
    const onSelect = vi.fn();
    const { container } = render(<FileExplorer data={[]} onSelect={onSelect} />);
    expect(container).toBeInTheDocument();
  });

  it('expands folder from controlled expandedItemIds', () => {
    const onSelect = vi.fn();
    render(
      <FileExplorer
        data={treeData}
        onSelect={onSelect}
        expandedItemIds={['1']}
        selectedItemId="2"
      />,
    );

    expect(screen.getByText('File A')).toBeInTheDocument();
  });
});
