/** @vitest-environment happy-dom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '@/lib/i18n';

// Mock mermaid so tests don't need a real browser environment
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg"></svg>' }),
  },
}));

// Mock next-themes so the component has a stable theme in tests
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

import { DiagramBlock } from './DiagramBlock';
import { isDiagramBlockContent } from '../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const wrap = (ui: React.ReactElement) => render(<Wrapper>{ui}</Wrapper>);
const baseContent = { code: 'flowchart TD\n  A --> B' };

describe('DiagramBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Tab rendering ─────────────────────────────────────────────────────────

  it('renders Preview and Edit tab buttons in edit mode', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides tab buttons in view mode (default)', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);
    // Zoom buttons are still there but tab switcher is hidden in view mode
    expect(screen.queryByRole('button', { name: /^preview$/i })).not.toBeInTheDocument();
  });

  it('starts on the Preview tab (Preview button has active style)', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);
    expect(screen.getByRole('button', { name: /preview/i })).toHaveClass('bg-card');
  });

  it('shows the textarea when Edit tab is clicked', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(baseContent.code);
  });

  it('shows placeholder when code is empty and Edit tab is active', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={{ code: '' }} onChange={vi.fn()} isEditing />);
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder');
  });

  it('hides textarea when switching back to Preview tab', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  // ── Editing ───────────────────────────────────────────────────────────────

  it('calls onChange when code is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={onChange} isEditing />);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'graph LR\n  X --> Y' } });

    expect(onChange).toHaveBeenCalledWith({ code: 'graph LR\n  X --> Y' });
  });

  // ── Diagram type picker ───────────────────────────────────────────────────

  it('shows a diagram type picker button in the toolbar when editing', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);
    // The type picker button shows the detected type name (e.g. "Flowchart")
    // or "Diagram" as fallback
    const typeButtons = screen.getAllByRole('button');
    const hasDiagramType = typeButtons.some(
      (b) => b.textContent && /flowchart|sequence|class|gantt|pie|mindmap|diagram/i.test(b.textContent),
    );
    expect(hasDiagramType).toBe(true);
  });

  it('opens the type picker dropdown on click', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} isEditing />);

    // The toolbar has tab buttons + the type picker. The type picker button
    // shows the detected type name (Flowchart for flowchart TD) with a chevron.
    // We find it by position: it's the button whose text includes "Flowchart"
    // but is NOT inside the dropdown (dropdown doesn't exist yet before click).
    const allBtns = screen.getAllByRole('button');
    const pickerBtn = allBtns.find((b) => /flowchart/i.test(b.textContent ?? ''));
    expect(pickerBtn).toBeDefined();

    await user.click(pickerBtn!);

    // After clicking, the dropdown appears. "Sequence" is only in the dropdown.
    expect(screen.getByRole('button', { name: /^Sequence$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gantt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pie Chart/i })).toBeInTheDocument();
  });

  it('loads a template and switches to preview when a diagram type is chosen', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={onChange} isEditing />);

    // Open picker
    const allBtns = screen.getAllByRole('button');
    const pickerBtn = allBtns.find((b) => /flowchart/i.test(b.textContent ?? ''));
    await user.click(pickerBtn!);

    // Click "Sequence" template in the dropdown (only in dropdown, unique)
    await user.click(screen.getByRole('button', { name: /^Sequence$/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ code: expect.stringContaining('sequenceDiagram') }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  // ── Zoom controls ─────────────────────────────────────────────────────────

  it('renders zoom controls in preview mode', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);
    expect(screen.getByTitle(/zoom in/i)).toBeInTheDocument();
    expect(screen.getByTitle(/zoom out/i)).toBeInTheDocument();
    expect(screen.getByTitle(/reset zoom/i)).toBeInTheDocument();
  });

  it('starts at 100% zoom and updates on zoom in/out', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);

    // Initial zoom should show 100%
    expect(screen.getByTitle(/reset zoom/i)).toHaveTextContent('100%');

    await user.click(screen.getByTitle(/zoom in/i));
    expect(screen.getByTitle(/reset zoom/i)).toHaveTextContent('120%');

    await user.click(screen.getByTitle(/zoom out/i));
    expect(screen.getByTitle(/reset zoom/i)).toHaveTextContent('100%');
  });

  it('resets zoom to 100% when the reset button is clicked', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);

    await user.click(screen.getByTitle(/zoom in/i));
    await user.click(screen.getByTitle(/zoom in/i));
    expect(screen.getByTitle(/reset zoom/i)).toHaveTextContent('140%');

    await user.click(screen.getByTitle(/reset zoom/i));
    expect(screen.getByTitle(/reset zoom/i)).toHaveTextContent('100%');
  });

  it('disables zoom-out when at minimum zoom', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);

    // Zoom out 4 times to reach min (1.0 - 0.2*3 = 0.4)
    for (let i = 0; i < 4; i++) {
      const btn = screen.getByTitle(/zoom out/i);
      if (!btn.hasAttribute('disabled')) await user.click(btn);
    }

    expect(screen.getByTitle(/zoom out/i)).toBeDisabled();
  });

  // ── Type guard ────────────────────────────────────────────────────────────

  it('is identified by isDiagramBlockContent type guard', () => {
    expect(isDiagramBlockContent({ code: 'flowchart LR\n  A-->B' }, 'diagram')).toBe(true);
    expect(isDiagramBlockContent({ code: '' }, 'diagram')).toBe(true);
    expect(isDiagramBlockContent({ code: 'x', language: 'js' } as never, 'diagram')).toBe(false);
    expect(isDiagramBlockContent({ code: '' }, 'code' as never)).toBe(false);
  });
});
