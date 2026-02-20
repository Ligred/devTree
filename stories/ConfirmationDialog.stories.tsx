import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ConfirmationProvider, useConfirmation } from '@/lib/confirmationContext';
import type { ConfirmationConfig } from '@/lib/confirmationContext';

const meta: Meta = {
  title: 'UI/ConfirmationDialog',
};

export default meta;

type DemoTriggerProps = Readonly<{
  variant?: ConfirmationConfig['variant'];
  tone?: ConfirmationConfig['tone'];
}>;

function DemoTrigger({ variant = 'default', tone = 'default' }: DemoTriggerProps) {
  const { confirm } = useConfirmation();

  return (
    <button
      onClick={async () => {
        const ok = await confirm({
          title: 'Confirm action',
          description: 'Demo confirmation dialog',
          confirmText: 'OK',
          cancelText: 'Cancel',
          variant,
          tone,
        });
         
        console.log('Confirmed:', ok);
      }}
      className="rounded bg-primary px-4 py-2 text-white"
    >
      Open {variant}
    </button>
  );
}

type Story = StoryObj<typeof DemoTrigger>;

export const Modal: Story = {
  render: () => (
    <ConfirmationProvider>
      <DemoTrigger variant="default" />
    </ConfirmationProvider>
  ),
};

export const Toast: Story = {
  render: () => (
    <ConfirmationProvider>
      <DemoTrigger variant="toast" />
    </ConfirmationProvider>
  ),
};

export const Inline: Story = {
  render: () => (
    <ConfirmationProvider>
      <DemoTrigger variant="inline" />
    </ConfirmationProvider>
  ),
};
