import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CodeBlock } from '@/components/MainContent/blocks/CodeBlock';

const meta: Meta<typeof CodeBlock> = {
  title: 'Components/Blocks/CodeBlock',
  component: CodeBlock,
  parameters: { layout: 'centered' },
  argTypes: {
    content: { control: false },
  },
};

export default meta;

type Story = StoryObj<typeof CodeBlock>;

export const JavaScript: Story = {
  args: {
    content: {
      code: `function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}`,
      language: 'javascript',
    },
  },
};

export const TypeScript: Story = {
  args: {
    content: {
      code: `const greeting: string = "Hello, world!";
console.log(greeting);`,
      language: 'typescript',
    },
  },
};

export const Minimal: Story = {
  args: {
    content: {
      code: 'const x = 1;',
      language: 'javascript',
    },
  },
};
