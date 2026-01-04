import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FileExplorer } from '@/app/ui/components/FileExplorer/FileExplorer'

const meta: Meta<typeof FileExplorer> = {
  title: 'Components/FileExplorer',
  component: FileExplorer,
  parameters: { layout: 'fullscreen' },
  argTypes: { onSelect: { action: 'selected' } }
}

export default meta
type Story = StoryObj<typeof FileExplorer>

export const Default: Story = {
  args: {}
}

export const Expanded: Story = {
  args: {},
  parameters: { 
    nextjs: { router: { pathname: '/hooks' } } // mock route
  }
}

export const Empty: Story = {
  args: {}
}
