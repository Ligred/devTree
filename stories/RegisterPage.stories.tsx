import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import RegisterPage from '@/app/register/page';

const meta: Meta<typeof RegisterPage> = {
  title: 'Auth/RegisterPage',
  component: RegisterPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {};
