/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
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

import { DiagramBlock } from './DiagramBlock';
import { isDiagramBlockContent } from '../types';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const baseContent = { code: 'flowchart TD\n  A --> B' };

describe('DiagramBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  const wrap = (ui: React.ReactElement) => render(<Wrapper>{ui}</Wrapper>);

  it('renders tab bar with Edit and Preview tabs', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('starts on the Preview tab', () => {
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);
    const previewBtn = screen.getByRole('button', { name: /preview/i });
    expect(previewBtn).toHaveClass('bg-card');
  });

  it('shows the textarea when Edit tab is clicked', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(baseContent.code);
  });

  it('shows placeholder when code is empty and Edit tab is active', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={{ code: '' }} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder');
  });

  // ── Editing ───────────────────────────────────────────────────────────────

  it('calls onChange when code is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'graph LR\n  X --> Y' } });

    expect(onChange).toHaveBeenCalledWith({ code: 'graph LR\n  X --> Y' });
  });

  // ── Tab switching ─────────────────────────────────────────────────────────

  it('hides textarea when switching back to Preview tab', async () => {
    const user = userEvent.setup();
    wrap(<DiagramBlock content={baseContent} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  // ── Type guard ────────────────────────────────────────────────────────────

  it('is identified by isDiagramBlockContent type guard', () => {
    expect(isDiagramBlockContent({ code: 'flowchart LR\n  A-->B' }, 'diagram')).toBe(true);
    expect(isDiagramBlockContent({ code: '' }, 'diagram')).toBe(true);
    expect(isDiagramBlockContent({ code: 'x', language: 'js' } as never, 'diagram')).toBe(false);
    expect(isDiagramBlockContent({ code: '' }, 'code' as never)).toBe(false);
  });
});
