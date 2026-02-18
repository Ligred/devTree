/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

import { FolderRenameRow } from './FolderRenameRow';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

type FolderRenameRowProps = React.ComponentProps<typeof FolderRenameRow>;

function renderRow(props: FolderRenameRowProps) {
  return render(<Wrapper><FolderRenameRow {...props} /></Wrapper>);
}

const baseItem = { id: 'folder-1', name: 'My Folder' };

describe('FolderRenameRow', () => {
  it('renders the item name as a label for a file (leaf)', () => {
    renderRow({ item: baseItem, isLeaf: true, isSelected: false, onRenameFolder: vi.fn(), editingFolderId: null, setEditingFolderId: vi.fn() });
    expect(screen.getByText('My Folder')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders an input when editingFolderId matches the item id', () => {
    renderRow({ item: baseItem, isLeaf: false, isSelected: false, onRenameFolder: vi.fn(), editingFolderId: 'folder-1', setEditingFolderId: vi.fn() });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Folder')).toBeInTheDocument();
  });

  it('does not render an input when editingFolderId is a different id', () => {
    renderRow({ item: baseItem, isLeaf: false, isSelected: false, onRenameFolder: vi.fn(), editingFolderId: 'folder-99', setEditingFolderId: vi.fn() });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('calls onRenameFolder with trimmed name on Enter', () => {
    const onRenameFolder = vi.fn();
    const setEditingFolderId = vi.fn();
    renderRow({ item: baseItem, isLeaf: false, isSelected: false, onRenameFolder, editingFolderId: 'folder-1', setEditingFolderId });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Renamed Folder  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRenameFolder).toHaveBeenCalledWith('folder-1', 'Renamed Folder');
    expect(setEditingFolderId).toHaveBeenCalledWith(null);
  });

  it('cancels rename on Escape without calling onRenameFolder', () => {
    const onRenameFolder = vi.fn();
    const setEditingFolderId = vi.fn();
    renderRow({ item: baseItem, isLeaf: false, isSelected: false, onRenameFolder, editingFolderId: 'folder-1', setEditingFolderId });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRenameFolder).not.toHaveBeenCalled();
    expect(setEditingFolderId).toHaveBeenCalledWith(null);
  });

  it('does not call onRenameFolder when name is unchanged on commit', () => {
    const onRenameFolder = vi.fn();
    renderRow({ item: baseItem, isLeaf: false, isSelected: false, onRenameFolder, editingFolderId: 'folder-1', setEditingFolderId: vi.fn() });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onRenameFolder).not.toHaveBeenCalled();
  });
});
