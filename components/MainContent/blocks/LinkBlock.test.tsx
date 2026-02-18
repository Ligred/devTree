/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { LinkBlock } from './LinkBlock';

describe('LinkBlock', () => {
  it('renders link with label and url', () => {
    render(
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
    render(
      <LinkBlock content={{ url: 'https://example.com' }} onChange={vi.fn()} />,
    );
    const link = screen.getByRole('link', { name: /external link/i });
    expect(link).toHaveTextContent('https://example.com');
  });

  it('renders url under link when label is provided', () => {
    render(
      <LinkBlock
        content={{ url: 'https://x.com', label: 'X' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('https://x.com')).toBeInTheDocument();
  });

  it('shows edit form when url is empty', () => {
    render(<LinkBlock content={{ url: '' }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/https:\/\/example.com/i)).toBeInTheDocument();
  });
});
