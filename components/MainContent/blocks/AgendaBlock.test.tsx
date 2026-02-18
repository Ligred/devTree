/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { AgendaBlock } from './AgendaBlock';
import type { AgendaBlockContent } from '../types';

const baseContent: AgendaBlockContent = {
  title: 'My Checklist',
  items: [
    { id: '1', text: 'First task', checked: false },
    { id: '2', text: 'Second task', checked: true },
  ],
};

describe('AgendaBlock', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the title', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('My Checklist')).toBeInTheDocument();
  });

  it('renders all items as text in view mode', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} />);
    // In view mode items are spans, not inputs
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
  });

  it('renders all items as editable inputs in edit mode', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} isEditing />);
    expect(screen.getByDisplayValue('First task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Second task')).toBeInTheDocument();
  });

  it('renders checked items with their checkbox checked', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked(); // First task
    expect(checkboxes[1]).toBeChecked();     // Second task
  });

  it('renders progress counter', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('renders Add item button only in edit mode', () => {
    render(<AgendaBlock content={baseContent} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument();

    render(<AgendaBlock content={baseContent} onChange={vi.fn()} isEditing />);
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  // ── Interactions ─────────────────────────────────────────────────────────

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    render(<AgendaBlock content={baseContent} onChange={onChange} />);

    const titleInput = screen.getByDisplayValue('My Checklist');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Title' }),
    );
  });

  it('calls onChange with toggled item when checkbox is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AgendaBlock content={baseContent} onChange={onChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];
    if (!firstCheckbox) throw new Error('No checkboxes found');
    await user.click(firstCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: '1', checked: true }),
        ]),
      }),
    );
  });

  it('calls onChange with new item when Add item is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AgendaBlock content={baseContent} onChange={onChange} isEditing />);

    await user.click(screen.getByRole('button', { name: /add item/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ text: '', checked: false }),
        ]),
      }),
    );
    const lastCall = onChange.mock.calls.at(-1)![0] as AgendaBlockContent;
    expect(lastCall.items).toHaveLength(3);
  });

  it('adds new item after Enter key in an item input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AgendaBlock content={baseContent} onChange={onChange} isEditing />);

    const firstInput = screen.getByDisplayValue('First task');
    await user.click(firstInput);
    await user.keyboard('{Enter}');

    const lastCallArg = onChange.mock.calls.at(-1)![0];
    const lastCall = lastCallArg as AgendaBlockContent;
    expect(lastCall.items).toHaveLength(3);
    // New item should be inserted after 'First task' (index 1)
    expect(lastCall.items[1]).toMatchObject({ text: '', checked: false });
  });

  it('removes item on Backspace when text is empty (keeps min 1)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    // Two items, second one is empty — title is non-empty to avoid ambiguity
    const content: AgendaBlockContent = {
      title: 'My Tasks',
      items: [
        { id: '1', text: 'Keep me', checked: false },
        { id: '2', text: '', checked: false },
      ],
    };
    render(<AgendaBlock content={content} onChange={onChange} isEditing />);

    // Use placeholder to target the item input (not the title input)
    const itemInputs = screen.getAllByPlaceholderText(/to-do item/i);
    const emptyInput = itemInputs.find(
      (el) => (el as HTMLInputElement).value === '',
    );
    if (!emptyInput) throw new Error('No empty item input found');
    await user.click(emptyInput);
    await user.keyboard('{Backspace}');

    const lastCallArg2 = onChange.mock.calls.at(-1)![0];
    const lastCall2 = lastCallArg2 as AgendaBlockContent;
    expect(lastCall2.items).toHaveLength(1);
    expect(lastCall2.items.at(0)?.text).toBe('Keep me');
  });

  it('does NOT remove the last item on Backspace', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const singleItem: AgendaBlockContent = {
      title: '',
      items: [{ id: '1', text: '', checked: false }],
    };
    render(<AgendaBlock content={singleItem} onChange={onChange} isEditing />);

    const input = screen.getByPlaceholderText(/to-do item/i);
    await user.click(input);
    await user.keyboard('{Backspace}');

    // onChange should NOT have been called (or called with 1 item still)
    onChange.mock.calls.forEach((args) => {
      const c = args[0] as AgendaBlockContent;
      if (c?.items !== undefined) {
        expect(c.items.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
