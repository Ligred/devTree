import type { StorybookConfig } from '@storybook/nextjs-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-themes"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    // es6-promise-pool is a CJS-only package used by @excalidraw/excalidraw.
    // Without pre-bundling it Vite serves it as a raw CJS file which throws
    // "is not a constructor" errors in the browser test environment.
    return mergeConfig(config, {
      optimizeDeps: {
        include: ['es6-promise-pool'],
      },
    });
  },
};
export default config;