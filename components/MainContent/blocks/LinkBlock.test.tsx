/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { LinkBlock } from './LinkBlock';

function renderBlock(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('LinkBlock', () => {
  it('renders link with label and url', () => {
    renderBlock(
      <LinkBlock
        content={{ url: 'https://react.dev', label: 'React Docs' }}
        onChange={vi.fn()}
      />,
    );
    const link = screen.getByRole('link', { name: /react docs \(external link\)/i });
    expect(link).toHaveAttribute('href', 'https://react.dev');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses url as display text when label is empty', () => {
    renderBlock(
      <LinkBlock content={{ url: 'https://example.com' }} onChange={vi.fn()} />,
    );
    const link = screen.getByRole('link', { name: /external link/i });
    expect(link).toHaveTextContent('https://example.com');
  });

  it('renders url under link when label is provided', () => {
    renderBlock(
      <LinkBlock
        content={{ url: 'https://x.com', label: 'X' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('https://x.com')).toBeInTheDocument();
  });

  it('shows edit form when url is empty', () => {
    renderBlock(<LinkBlock content={{ url: '' }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/https:\/\/example.com/i)).toBeInTheDocument();
  });
});
