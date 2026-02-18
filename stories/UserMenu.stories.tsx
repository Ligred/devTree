import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { UserMenu } from '@/components/UserMenu/UserMenu';

const meta: Meta<typeof UserMenu> = {
  title: 'Components/UserMenu',
  component: UserMenu,
  parameters: { layout: 'centered' },
  argTypes: {
    onOpenSettings: { action: 'openSettings' },
  },
};

export default meta;

type Story = StoryObj<typeof UserMenu>;

export const Default: Story = {
  args: {
    onOpenSettings: fn(),
  },
};
