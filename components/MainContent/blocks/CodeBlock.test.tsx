/** @vitest-environment happy-dom */

/**
 * CodeBlock unit tests.
 *
 * Key testing concerns:
 *   1. Language selector renders the correct language label.
 *   2. Default language falls back to 'javascript' when not specified.
 *   3. The Copy button is present.
 *
 * WHY not test Monaco editor output?
 *   Monaco is dynamically imported with `ssr: false`. In the happy-dom test
 *   environment the dynamic import resolves to a no-op (the mock below). Testing
 *   Monaco internals would require a full browser environment (Playwright/Cypress).
 *   The meaningful tests are on the surrounding UI (language picker, copy button).
 *
 * WHY mock next-themes?
 *   useTheme() accesses a React context set up by ThemeProvider. Without the
 *   provider the hook throws. The mock returns a stable resolvedTheme so tests
 *   can focus on the component, not theme infrastructure.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

// Monaco is a browser-only module. Mock it so it doesn't explode in Node.
vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

// Provide a stable theme so useTheme() doesn't throw in tests.
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders language label in header', () => {
    render(
      <CodeBlock
        content={{ code: 'const x = 1;', language: 'typescript' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('uses default language (javascript) when not provided', () => {
    render(
      <CodeBlock content={{ code: 'const x = 1;' }} onChange={vi.fn()} />,
    );
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders the Copy button', () => {
    render(
      <CodeBlock
        content={{ code: 'hello', language: 'python' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTitle('Copy code')).toBeInTheDocument();
  });

  it('renders the "Code" type label', () => {
    render(
      <CodeBlock
        content={{ code: '', language: 'rust' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Code')).toBeInTheDocument();
  });
});
