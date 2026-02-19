import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AudioBlock } from '@/components/MainContent/blocks/AudioBlock';

const meta: Meta<typeof AudioBlock> = {
  title: 'Components/Blocks/AudioBlock',
  component: AudioBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: false },
    onChange: { action: 'contentChange' },
  },
};

export default meta;

type Story = StoryObj<typeof AudioBlock>;

export const Empty: Story = {
  args: {
    content: { url: '', caption: '' },
    onChange: () => {},
  },
};

export const WithUrl: Story = {
  args: {
    content: {
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      caption: '',
    },
    onChange: () => {},
  },
};

export const WithCaption: Story = {
  args: {
    content: {
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      caption: 'Meeting notes from Monday standup',
    },
    onChange: () => {},
  },
};
