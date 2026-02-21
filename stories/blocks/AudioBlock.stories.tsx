import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { AudioBlock } from '@/components/MainContent';
import type { AudioBlockContent } from '@/components/MainContent';

const meta: Meta<typeof AudioBlock> = {
  title: 'Components/Blocks/AudioBlock',
  component: AudioBlock,
  parameters: { layout: 'padded' },
  argTypes: {
    onChange: { action: 'change' },
    enterEdit: { action: 'enterEdit' },
    exitEdit: { action: 'exitEdit' },
    isEditing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof AudioBlock>;

const emptyContent: AudioBlockContent = { url: '' };

const audioContent: AudioBlockContent = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Audio_MP3_Beethoven_5th_Symphony%2C_1st_Movement.mp3',
};

const audioWithCaption: AudioBlockContent = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Audio_MP3_Beethoven_5th_Symphony%2C_1st_Movement.mp3',
  caption: 'Beethoven — Symphony No. 5, 1st Movement (public domain)',
};

/** Empty state — no URL set. Shows the "Add audio URL" prompt. */
export const EmptyState: Story = {
  args: {
    content: emptyContent,
    onChange: fn(),
    enterEdit: fn(),
    exitEdit: fn(),
    isEditing: false,
  },
};

/** Edit mode with empty URL — shows the URL input form. */
export const EditModeEmpty: Story = {
  args: {
    content: emptyContent,
    onChange: fn(),
    enterEdit: fn(),
    exitEdit: fn(),
    isEditing: true,
  },
};

/** Edit mode with an existing URL — form is pre-filled. */
export const EditModeWithUrl: Story = {
  args: {
    content: audioWithCaption,
    onChange: fn(),
    enterEdit: fn(),
    exitEdit: fn(),
    isEditing: true,
  },
};

/** Player view — audio URL is set, native browser controls are shown. */
export const Player: Story = {
  args: {
    content: audioContent,
    onChange: fn(),
    enterEdit: fn(),
    exitEdit: fn(),
    isEditing: false,
  },
};

/** Player with caption — displayed below the audio controls. */
export const PlayerWithCaption: Story = {
  args: {
    content: audioWithCaption,
    onChange: fn(),
    enterEdit: fn(),
    exitEdit: fn(),
    isEditing: false,
  },
};
