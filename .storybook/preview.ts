import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css'; // or './globals.css' — your Tailwind/shadcn CSS
// If shadcn theme: import { ThemeProvider } from '@/components/theme-provider';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  // Optional: shadcn dark mode decorator
  decorators: [
    // (Story) => (
    //   <ThemeProvider defaultTheme="dark">
    //     <Story />
    //   </ThemeProvider>
    // ),
  ],
};

export default preview;
