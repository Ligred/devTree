import type { Preview } from '@storybook/nextjs-vite';
import React from 'react';
import { ThemeProvider } from 'next-themes';

import { I18nProvider } from '@/lib/i18n';

import '../app/globals.css';

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
  decorators: [
    (Story) =>
      React.createElement(
        ThemeProvider,
        { attribute: 'class', defaultTheme: 'system', enableSystem: true },
        React.createElement(I18nProvider, null, React.createElement(Story)),
      ),
  ],
};

export default preview;
