import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LinkBlock } from '@/components/MainContent/blocks/LinkBlock';

const meta: Meta<typeof LinkBlock> = {
  title: 'Components/Blocks/LinkBlock',
  component: LinkBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: false },
  },
};

export default meta;

type Story = StoryObj<typeof LinkBlock>;

export const WithLabel: Story = {
  args: {
    content: {
      url: 'https://react.dev/reference/react',
      label: 'React Reference',
    },
  },
};

export const UrlOnly: Story = {
  args: {
    content: {
      url: 'https://github.com',
    },
  },
};
