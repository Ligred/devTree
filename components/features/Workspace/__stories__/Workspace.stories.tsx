import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Workspace } from '@/components/features/Workspace';

const meta: Meta<typeof Workspace> = {
  title: 'App/Workspace',
  component: Workspace,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full DevTree workspace: sidebar with tree (create folder/file, drag to move, double-click folder to rename) and main content area.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Workspace>;

export const Default: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/notebook',
      },
    },
  },
  render: () => (
    <div className="h-screen w-full">
      <Workspace />
    </div>
  ),
};
