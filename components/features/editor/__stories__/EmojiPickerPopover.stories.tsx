import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EmojiPickerPopover } from '../EmojiPickerPopover';

const fakeEditor = {
  chain: () => fakeEditor,
  focus: () => fakeEditor,
  insertContent: () => fakeEditor,
  run: () => true,
};

const meta: Meta<typeof EmojiPickerPopover> = {
  title: 'Components/EmojiPickerPopover',
  component: EmojiPickerPopover,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof EmojiPickerPopover>;

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <EmojiPickerPopover
        editor={fakeEditor as any}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      />
    );
  },
};

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <EmojiPickerPopover
        editor={fakeEditor as any}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      />
    );
  },
};
