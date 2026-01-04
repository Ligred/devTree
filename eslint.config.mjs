// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  // 1. Next.js Base Configs
  ...nextVitals,
  ...nextTs,

  // 2. Tailwind CSS Recommended (Flat Config)
  // Spreads the recommended config arrays from the plugin
  // ...tailwind.configs['flat/recommended'],   eslint-plugin-tailwindcss deps issue

  // 3. SonarJS Recommended
  sonarjs.configs.recommended,

  // 4. Custom Rules & Plugins
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // --- Unused Imports ---
      // Disable the default rule so we don't get double errors
      'no-unused-vars': 'off',
      // Enable the auto-fixable rule
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // --- Tailwind Tweaks ---
      // Optional: Disable if you use a lot of custom classes like 'animate-fade-in'
      'tailwindcss/no-custom-classname': 'off',

      // --- SonarJS Tweaks ---
      // Example: Reduce severity of duplicate strings if it's annoying
      'sonarjs/no-duplicate-string': 'warn',
    },
  },

  // 5. Global Ignores
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // 6. Prettier Config
  // MUST come last to override any formatting rules from previous configs
  prettierConfig,
]);

export default eslintConfig;
