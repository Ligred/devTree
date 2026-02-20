import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import RegisterPage from '@/app/register/page';
import React from 'react';

const meta: Meta<typeof RegisterPage> = {
  title: 'Auth/RegisterPage',
  component: RegisterPage,
  parameters: {
    layout: 'fullscreen',
  },
  // Story is a stub; avoid full app decorators in Storybook test environment.
};

export default meta;

type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {
  render: () => <div style={{padding: 40}}>RegisterPage story stub (router not available in Storybook)</div>,
};
