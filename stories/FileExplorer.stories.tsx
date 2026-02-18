import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FileExplorer } from '@/components/FileExplorer/FileExplorer';
import type { TreeDataItem } from '@/components/ui/tree-view';

const sampleData: TreeDataItem[] = [
  {
    id: 'learning',
    name: 'My learning',
    children: [
      {
        id: 'frontend',
        name: 'Frontend',
        children: [
          { id: 'react-hooks', name: 'React Hooks' },
          { id: 'tailwind', name: 'Tailwind' },
        ],
      },
      {
        id: 'backend',
        name: 'Backend',
        children: [{ id: 'api-auth', name: 'API Authentication' }],
      },
    ],
  },
];

const meta: Meta<typeof FileExplorer> = {
  title: 'Components/FileExplorer',
  component: FileExplorer,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    data: { control: false },
    onSelect: { action: 'selected' },
  },
};

export default meta;

type Story = StoryObj<typeof FileExplorer>;

export const Default: Story = {
  args: {
    data: sampleData,
    onSelect: fn(),
  },
};

export const Empty: Story = {
  args: {
    data: [],
    onSelect: fn(),
  },
};

export const SinglePage: Story = {
  args: {
    data: [{ id: 'only', name: 'Only page' }],
    onSelect: fn(),
  },
};
