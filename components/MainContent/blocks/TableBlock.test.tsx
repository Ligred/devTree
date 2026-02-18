/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { TableBlock } from './TableBlock';

const baseContent = {
  headers: ['Name', 'Value'],
  rows: [['useState', 'state'], ['useEffect', 'effect']],
};

describe('TableBlock', () => {
  it('renders headers as static text in view mode (default)', () => {
    render(<TableBlock content={baseContent} onChange={vi.fn()} />);
    // View mode renders <th> cells, not inputs
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('useState')).toBeInTheDocument();
  });

  it('renders editable header inputs in edit mode', () => {
    render(<TableBlock content={baseContent} onChange={vi.fn()} isEditing />);
    expect(screen.getByDisplayValue('Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('useState')).toBeInTheDocument();
    expect(screen.getByDisplayValue('effect')).toBeInTheDocument();
  });

  it('renders add row button only in edit mode', () => {
    render(<TableBlock content={{ headers: ['A'], rows: [] }} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /add row/i })).not.toBeInTheDocument();

    render(<TableBlock content={{ headers: ['A'], rows: [] }} onChange={vi.fn()} isEditing />);
    expect(screen.getByRole('button', { name: /add row/i })).toBeInTheDocument();
  });

  it('calls onChange when a cell is edited in edit mode', () => {
    const onChange = vi.fn();
    render(<TableBlock content={baseContent} onChange={onChange} isEditing />);
    const cell = screen.getByDisplayValue('useState');
    fireEvent.change(cell, { target: { value: 'useMemo' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.arrayContaining(['useMemo'])]),
      }),
    );
  });

  it('addColumn appends a new column to headers and every row', () => {
    const onChange = vi.fn();
    render(<TableBlock content={baseContent} onChange={onChange} isEditing />);
    fireEvent.click(screen.getByRole('button', { name: /add column/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: ['Name', 'Value', expect.stringMatching(/Column/)],
        rows: expect.arrayContaining([expect.arrayContaining(['useState', 'state', ''])]),
      }),
    );
  });

  it('addRow appends an empty row', () => {
    const onChange = vi.fn();
    render(<TableBlock content={baseContent} onChange={onChange} isEditing />);
    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([['', '']]),
      }),
    );
  });

  it('removeColumn removes the column at the given index', () => {
    const onChange = vi.fn();
    render(<TableBlock content={baseContent} onChange={onChange} isEditing />);
    // Each column header row has a remove button; click the first one
    const removeButtons = screen.getAllByRole('button', { name: /remove column/i });
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: ['Value'],
        rows: expect.arrayContaining([['state'], ['effect']]),
      }),
    );
  });

  it('calls onChange when a header is edited in edit mode', () => {
    const onChange = vi.fn();
    render(<TableBlock content={baseContent} onChange={onChange} isEditing />);
    const header = screen.getByDisplayValue('Name');
    fireEvent.change(header, { target: { value: 'Hook' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: ['Hook', 'Value'] }),
    );
  });
});
