/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';

import { BlockEditor } from './BlockEditor';
import type { AgendaBlockContent, Block, TableBlockContent } from './types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const wrap = (ui: React.ReactElement) => render(<Wrapper>{ui}</Wrapper>);

const textBlock: Block = { id: 'b1', type: 'text', content: '<p>Hello</p>', colSpan: 2 };
const linkBlock: Block = {
  id: 'b2',
  type: 'link',
  content: { url: 'https://example.com', label: 'Example' },
  colSpan: 2,
};
const tableBlock: Block = {
  id: 'b3',
  type: 'table',
  content: { headers: ['A', 'B'], rows: [['1', '2']] },
  colSpan: 2,
};
const agendaBlock: Block = {
  id: 'b4',
  type: 'agenda',
  content: { title: 'Tasks', items: [{ id: 'i1', text: 'Do stuff', checked: false }] },
  colSpan: 2,
};

describe('BlockEditor', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders an empty editor with Add block button', () => {
    wrap(<BlockEditor blocks={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add block/i })).toBeInTheDocument();
  });

  it('renders provided blocks', () => {
    wrap(<BlockEditor blocks={[linkBlock, tableBlock]} onChange={vi.fn()} />);
    // Link block renders the href
    expect(screen.getByRole('link', { name: /example/i })).toBeInTheDocument();
    // Table block renders headers
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });

  it('renders delete button for each block', () => {
    wrap(<BlockEditor blocks={[linkBlock, tableBlock]} onChange={vi.fn()} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete block/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('renders drag handle for each block', () => {
    wrap(<BlockEditor blocks={[linkBlock, tableBlock]} onChange={vi.fn()} />);
    const handles = screen.getAllByRole('button', { name: /drag to reorder/i });
    expect(handles).toHaveLength(2);
  });

  // ── Block deletion ────────────────────────────────────────────────────────

  it('calls onChange with block removed when delete is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[linkBlock, tableBlock]} onChange={onChange} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete block/i });
    const firstDelete = deleteButtons[0];
    if (!firstDelete) throw new Error('No delete buttons found');
    await user.click(firstDelete);

    expect(onChange).toHaveBeenCalledWith([tableBlock]);
  });

  it('calls onChange with empty array when sole block is deleted', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[linkBlock]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /delete block/i }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  // ── Adding blocks ─────────────────────────────────────────────────────────

  it('opens block picker when Add block button is clicked', async () => {
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add block/i }));

    // Picker should show block type options
    expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /checklist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument();
  });

  it('calls onChange with new link block when Link is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add block/i }));
    // Block picker buttons contain label + description; match on partial text
    await user.click(screen.getByRole('button', { name: /link/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'link' }),
      ]),
    );
  });

  it('calls onChange with new agenda block when Checklist is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add block/i }));
    await user.click(screen.getByRole('button', { name: /checklist/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'agenda' }),
      ]),
    );
  });

  // ── Column span toggle ────────────────────────────────────────────────────

  it('renders toggle width button for each block', () => {
    wrap(<BlockEditor blocks={[linkBlock]} onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /half width|full width/i }),
    ).toBeInTheDocument();
  });

  it('calls onChange with toggled colSpan when width button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    // linkBlock has colSpan: 2 (full), so button should offer "Half width"
    wrap(<BlockEditor blocks={[linkBlock]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /half width/i }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'b2', colSpan: 1 }),
    ]);
  });

  // ── Block content updates ─────────────────────────────────────────────────

  it('calls onChange when an agenda item is checked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<BlockEditor blocks={[agendaBlock]} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /do stuff/i });
    await user.click(checkbox);

    const lastCallArg = onChange.mock.calls.at(-1)![0];
    const lastBlocks = lastCallArg as Block[];
    const updatedAgenda = lastBlocks.find((b) => b.id === 'b4');
    const agendaContent = updatedAgenda?.content as AgendaBlockContent | undefined;
    expect(agendaContent?.items.at(0)?.checked).toBe(true);
  });

  it('calls onChange when a table cell is edited', () => {
    const onChange = vi.fn();
    wrap(<BlockEditor blocks={[tableBlock]} onChange={onChange} />);

    // Use fireEvent.change for controlled inputs (mock doesn't update props)
    const cell = screen.getByDisplayValue('1');
    fireEvent.change(cell, { target: { value: 'updated' } });

    const lastCallArg2 = onChange.mock.calls.at(-1)![0];
    const lastBlocks2 = lastCallArg2 as Block[];
    const updatedTable = lastBlocks2.find((b) => b.id === 'b3');
    const tableContent = updatedTable?.content as TableBlockContent | undefined;
    expect(tableContent?.rows.at(0)?.at(0)).toBe('updated');
  });
});
