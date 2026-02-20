import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import LoginPage from '@/app/login/page';
import React from 'react';

const meta: Meta<typeof LoginPage> = {
  title: 'Auth/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
  },
  // Story is a stub; avoid full app decorators in Storybook test environment.
};

export default meta;

type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {
  render: () => <div style={{padding: 40}}>LoginPage story stub (router not available in Storybook)</div>,
};
