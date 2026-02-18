/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { TableBlock } from './TableBlock';

describe('TableBlock', () => {
  it('renders editable header inputs', () => {
    render(
      <TableBlock
        content={{
          headers: ['Name', 'Value'],
          rows: [
            ['useState', 'state'],
            ['useEffect', 'effect'],
          ],
        }}
        onChange={vi.fn()}
      />,
    );
    // Headers are now inputs
    const nameInput = screen.getByDisplayValue('Name');
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByDisplayValue('Value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('useState')).toBeInTheDocument();
    expect(screen.getByDisplayValue('effect')).toBeInTheDocument();
  });

  it('renders add row button', () => {
    render(
      <TableBlock
        content={{ headers: ['A'], rows: [] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /add row/i })).toBeInTheDocument();
  });
});
