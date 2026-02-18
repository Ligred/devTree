/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { TextBlock } from './TextBlock';

describe('TextBlock', () => {
  it('renders the editor toolbar', () => {
    render(<TextBlock content="<p>Hello</p>" onChange={vi.fn()} />);
    // Toolbar buttons (titles include keyboard shortcut hints)
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
  });

  it('renders heading buttons in toolbar', () => {
    render(<TextBlock content="" onChange={vi.fn()} />);
    expect(screen.getByTitle('Heading 1 (H1)')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2 (H2)')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3 (H3)')).toBeInTheDocument();
  });
});
