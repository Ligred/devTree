import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TableBlock } from '@/components/MainContent/blocks/TableBlock';

const meta: Meta<typeof TableBlock> = {
  title: 'Components/Blocks/TableBlock',
  component: TableBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: false },
  },
};

export default meta;

type Story = StoryObj<typeof TableBlock>;

export const Default: Story = {
  args: {
    content: {
      headers: ['Hook', 'Purpose'],
      rows: [
        ['useState', 'Manage local state'],
        ['useEffect', 'Side effects and subscriptions'],
        ['useContext', 'Read context'],
      ],
    },
  },
};

export const Empty: Story = {
  args: {
    content: {
      headers: [],
      rows: [],
    },
  },
};

export const Wide: Story = {
  args: {
    content: {
      headers: ['Name', 'Type', 'Description', 'Example'],
      rows: [
        ['useState', 'State', 'Returns state and setter', 'const [x, setX] = useState(0)'],
        ['useEffect', 'Effect', 'Runs after render', 'useEffect(() => {}, [])'],
      ],
    },
  },
};
