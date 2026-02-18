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
    expect(screen.getByTitle('Heading 1 (H1)')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2 (H2)')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3 (H3)')).toBeInTheDocument();
  });
});
