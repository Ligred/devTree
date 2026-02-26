import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ActivityBar } from '@/components/shared/ActivityBar/ActivityBar';

const meta: Meta<typeof ActivityBar> = {
  title: 'App/ActivityBar',
  component: ActivityBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'VS Code-style icon-only activity bar. Renders the main navigation sections: Notebook, Statistics, Diary (disabled), and Settings (pinned to bottom).',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ActivityBar>;

export const OnNotebook: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/notebook' },
    },
  },
  render: () => (
    <div className="bg-background flex h-screen">
      <ActivityBar />
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Notebook content area
      </div>
    </div>
  ),
};

export const OnStatistics: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/statistics' },
    },
  },
  render: () => (
    <div className="bg-background flex h-screen">
      <ActivityBar />
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Statistics content area
      </div>
    </div>
  ),
};
