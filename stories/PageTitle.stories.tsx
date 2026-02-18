import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { PageTitle } from '@/components/MainContent/PageTitle';
import type { Page } from '@/components/MainContent';

const page: Page = {
  id: 'p1',
  title: 'My learning page',
  blocks: [],
};

const meta: Meta<typeof PageTitle> = {
  title: 'Components/PageTitle',
  component: PageTitle,
  parameters: { layout: 'centered' },
  argTypes: {
    onTitleChange: { action: 'titleChange' },
  },
};

export default meta;

type Story = StoryObj<typeof PageTitle>;

export const ReadOnly: Story = {
  args: {
    page,
    readOnly: true,
  },
};

export const Editable: Story = {
  args: {
    page,
    readOnly: false,
    onTitleChange: fn(),
  },
};
