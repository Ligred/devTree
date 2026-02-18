import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FolderRenameRow } from '@/components/Workspace/FolderRenameRow';

const meta: Meta<typeof FolderRenameRow> = {
  title: 'Components/Workspace/FolderRenameRow',
  component: FolderRenameRow,
  parameters: { layout: 'centered' },
  argTypes: {
    onRenameFolder: { action: 'renameFolder' },
    setEditingFolderId: { action: 'setEditingFolderId' },
  },
};

export default meta;

type Story = StoryObj<typeof FolderRenameRow>;

export const FileRow: Story = {
  args: {
    item: {
      id: 'page-1',
      name: 'My page',
      actions: <span className="text-xs text-slate-400">actions</span>,
    },
    isLeaf: true,
    isSelected: false,
    onRenameFolder: fn(),
    editingFolderId: null,
    setEditingFolderId: fn(),
  },
};

export const FolderRow: Story = {
  args: {
    item: {
      id: 'folder-1',
      name: 'My folder',
      children: [],
      actions: <span className="text-xs text-slate-400">+</span>,
    },
    isLeaf: false,
    isSelected: false,
    onRenameFolder: fn(),
    editingFolderId: null,
    setEditingFolderId: fn(),
  },
};

export const FolderRowEditing: Story = {
  args: {
    item: {
      id: 'folder-1',
      name: 'My folder',
      children: [],
      actions: <span className="text-xs text-slate-400">+</span>,
    },
    isLeaf: false,
    isSelected: true,
    onRenameFolder: fn(),
    editingFolderId: 'folder-1',
    setEditingFolderId: fn(),
  },
};
