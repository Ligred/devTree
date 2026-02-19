import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import LoginPage from '@/app/login/page';

const meta: Meta<typeof LoginPage> = {
  title: 'Auth/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {};
