import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TextBlock } from '@/components/MainContent/blocks/TextBlock';

const meta: Meta<typeof TextBlock> = {
  title: 'Components/Blocks/TextBlock',
  component: TextBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof TextBlock>;

export const Default: Story = {
  args: {
    content: 'React Hooks allow you to use state and other React features without writing a class.',
  },
};

export const Empty: Story = {
  args: {
    content: '',
  },
};

export const LongText: Story = {
  args: {
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
};
