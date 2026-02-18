import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { WhiteboardBlock } from '@/components/MainContent';
import type { WhiteboardBlockContent } from '@/components/MainContent';

const meta: Meta<typeof WhiteboardBlock> = {
  title: 'Components/Blocks/WhiteboardBlock',
  component: WhiteboardBlock,
  parameters: { layout: 'padded' },
  argTypes: {
    onChange: { action: 'change' },
    isEditing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof WhiteboardBlock>;

const emptyContent: WhiteboardBlockContent = { dataUrl: '' };

/** Default view mode — shows empty-state overlay. */
export const ViewModeEmpty: Story = {
  args: {
    content: emptyContent,
    onChange: fn(),
    isEditing: false,
  },
};

/** Edit mode — toolbar is visible, canvas is interactive. */
export const EditMode: Story = {
  args: {
    content: emptyContent,
    onChange: fn(),
    isEditing: true,
  },
};
