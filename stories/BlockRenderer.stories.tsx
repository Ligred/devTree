import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ConfirmationProvider } from '@/lib/confirmationContext';
import { BlockEditor } from '@/components/MainContent';
import type { Block } from '@/components/MainContent';

const blocks: Block[] = [
  {
    id: 't1',
    type: 'text',
    content: '<p>First paragraph of <strong>notes</strong>.</p>',
    colSpan: 2,
  },
  {
    id: 'c1',
    type: 'code',
    content: { code: 'const x = 1;', language: 'javascript' },
    colSpan: 2,
  },
  {
    id: 'l1',
    type: 'link',
    content: { url: 'https://example.com', label: 'Example' },
    colSpan: 1,
  },
  {
    id: 'a1',
    type: 'agenda',
    content: {
      title: 'Todo',
      items: [
        { id: 'i1', text: 'First task', checked: true },
        { id: 'i2', text: 'Second task', checked: false },
      ],
    },
    colSpan: 1,
  },
  {
    id: 'tb1',
    type: 'table',
    content: {
      headers: ['A', 'B'],
      rows: [['1', '2']],
    },
    colSpan: 2,
  },
  {
    id: 'd1',
    type: 'diagram',
    content: {
      code: `flowchart LR
    Client --> API
    API --> DB[(Database)]
    API --> Cache[(Cache)]`,
    },
    colSpan: 2,
  },
  {
    id: 'aud1',
    type: 'audio',
    content: {
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      caption: 'Sample audio note',
    },
    colSpan: 2,
  },
  {
    id: 'vid1',
    type: 'video',
    content: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    colSpan: 2,
  },
];

const meta: Meta<typeof BlockEditor> = {
  title: 'Components/BlockEditor',
  component: BlockEditor,
  parameters: { layout: 'padded' },
  argTypes: {
    onChange: { action: 'blocksChange' },
  },
  decorators: [
    (Story) => (
      <ConfirmationProvider>
        <Story />
      </ConfirmationProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BlockEditor>;

export const MixedBlocks: Story = {
  args: {
    blocks,
    onChange: fn(),
  },
};

export const Empty: Story = {
  args: {
    blocks: [],
    onChange: fn(),
  },
};
