import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TextBlock } from '@/components/MainContent/blocks/TextBlock';
import { I18nProvider } from '@/lib/i18n';
import { ConfirmationProvider } from '@/lib/confirmationContext';

const meta: Meta<typeof TextBlock> = {
  title: 'Components/Blocks/TextBlock',
  component: TextBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <ConfirmationProvider>
        <I18nProvider>
          <Story />
        </I18nProvider>
      </ConfirmationProvider>
    ),
  ],
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

export const WithCodeBlock: Story = {
  args: {
    content: '<p>Example:</p><pre><code>function hello() {\n  return "world";\n}</code></pre><p>End.</p>',
  },
};

export const WithComment: Story = {
  args: {
    content:
      '<p>This sentence has <span data-comment-id="c1" data-comment-text="Review this later" class="tiptap-comment">an inline comment</span> on it.</p>',
  },
};

export const EditMode: Story = {
  args: {
    isEditing: true,
    content: '<p>Edit this text with the full toolbar: code block, comment, link, colors, and more.</p>',
  },
};

export const EditModeWithVoiceDictation: Story = {
  args: {
    isEditing: true,
    content: '<p>Start voice dictation by clicking the microphone icon in the toolbar (Chrome only).</p>',
  },
};

export const EditModeWithLanguageSelector: Story = {
  args: {
    isEditing: true,
    content: '<p>Select dictation language by clicking the globe button next to the microphone (Chrome only). Supports English (EN) and Ukrainian (UK).</p>',
  },
};
