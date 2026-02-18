/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { TextBlock } from './TextBlock';

describe('TextBlock', () => {
  it('renders the editor toolbar when in edit mode', () => {
    render(<TextBlock content="<p>Hello</p>" onChange={vi.fn()} isEditing />);
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
  });

  it('hides the toolbar in view mode (default)', () => {
    render(<TextBlock content="<p>Hello</p>" onChange={vi.fn()} />);
    expect(screen.queryByTitle('Bold (Ctrl+B)')).not.toBeInTheDocument();
  });

  it('renders heading buttons in toolbar when editing', () => {
    render(<TextBlock content="" onChange={vi.fn()} isEditing />);
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
  });

  it('renders code block and comment buttons in toolbar when editing', () => {
    render(<TextBlock content="" onChange={vi.fn()} isEditing />);
    expect(screen.getByTitle('Code block')).toBeInTheDocument();
    expect(screen.getByTitle('Add comment')).toBeInTheDocument();
  });

  it('renders content with a code block', () => {
    render(
      <TextBlock
        content="<p>Before</p><pre><code>const x = 1;</code></pre><p>After</p>"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Before/)).toBeInTheDocument();
    expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    expect(screen.getByText(/After/)).toBeInTheDocument();
  });

  it('renders content with an inline comment mark', () => {
    render(
      <TextBlock
        content='<p>Text with <span data-comment-id="c1" data-comment-text="A note">comment</span>.</p>'
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Text with/)).toBeInTheDocument();
    expect(screen.getByText(/comment/)).toBeInTheDocument();
  });
});
