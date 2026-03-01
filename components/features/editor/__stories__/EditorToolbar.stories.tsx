import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EditorToolbar } from '../EditorToolbar';

// we need a minimal mock editor object just for the story; reuse patterns from tests
const fakeEditor = {
  state: { selection: { from: 1, to: 5, empty: false }, doc: { content: { size: 0 } }, },
  chain: () => fakeEditor,
  focus: () => fakeEditor,
  extendMarkRange: () => fakeEditor,
  setLink: () => fakeEditor,
  run: () => true,
  isActive: () => false,
  getAttributes: () => ({}),
};

const meta: Meta<typeof EditorToolbar> = {
  title: 'Components/EditorToolbar',
  component: EditorToolbar,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof EditorToolbar>;

export const Default: Story = {
  args: {
    editor: fakeEditor as any,
  },
};