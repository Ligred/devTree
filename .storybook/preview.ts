import type { Preview } from '@storybook/nextjs-vite';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
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
        SessionProvider,
        { session: null },
        React.createElement(
          ThemeProvider,
          { attribute: 'class', defaultTheme: 'system', enableSystem: true },
          React.createElement(I18nProvider, { initialLocale: 'en' }, React.createElement(Story)),
        ),
      ),
  ],
};

export default preview;
