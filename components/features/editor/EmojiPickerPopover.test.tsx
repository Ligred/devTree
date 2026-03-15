/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Import component after mocks ─────────────────────────────────────────────

import { EmojiPickerPopover } from './EmojiPickerPopover';

// ─── Capture onEmojiSelect from the Picker mock ───────────────────────────────

let capturedOnEmojiSelect: ((e: { native: string }) => void) | null = null;

vi.mock('@emoji-mart/react', () => ({
  default: (props: { onEmojiSelect: (e: { native: string }) => void }) => {
    capturedOnEmojiSelect = props.onEmojiSelect;
    return null;
  },
}));

vi.mock('@emoji-mart/data', () => ({ default: {} }));

vi.mock('./EditorToolbar', () => ({
  ToolbarButton: ({
    onClick,
    children,
    title,
    active: _active,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    title: string;
    active?: boolean;
  }) => (
    <button type="button" onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));

// motion/react is used inside EmojiPickerPopover via AnimatePresence / motion.div
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) => (
      <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

// ─── Fake editor ──────────────────────────────────────────────────────────────

function buildFakeEditor() {
  const run = vi.fn();
  const fakeEditor = {
    run,
    chain: () => fakeEditor,
    focus: () => fakeEditor,
    insertContent: () => fakeEditor,
  };
  return fakeEditor;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmojiPickerPopover', () => {
  beforeEach(() => {
    capturedOnEmojiSelect = null;
  });

  it('renders the Emoji toolbar button', () => {
    const fakeEditor = buildFakeEditor();

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={false}
        onOpen={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Emoji')).toBeInTheDocument();
  });

  it('calls onOpen when the Emoji button is clicked', () => {
    const fakeEditor = buildFakeEditor();
    const onOpen = vi.fn();

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={false}
        onOpen={onOpen}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Emoji'));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('does not render the picker content when closed', () => {
    const fakeEditor = buildFakeEditor();

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={false}
        onOpen={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The mocked Picker sets capturedOnEmojiSelect only when rendered;
    // if the picker is not rendered, the captured callback stays null.
    expect(capturedOnEmojiSelect).toBeNull();
  });

  it('renders the picker when open is true', async () => {
    const fakeEditor = buildFakeEditor();

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={true}
        onOpen={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(capturedOnEmojiSelect).not.toBeNull();
    });
  });

  it('calls onClose and runs editor command when an emoji is selected', async () => {
    const fakeEditor = buildFakeEditor();
    const onClose = vi.fn();

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={true}
        onOpen={vi.fn()}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(capturedOnEmojiSelect).not.toBeNull();
    });

    act(() => {
      capturedOnEmojiSelect!({ native: '😊' });
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(fakeEditor.run).toHaveBeenCalledOnce();
  });

  it('inserts the selected emoji native character into the editor', async () => {
    const fakeEditor = buildFakeEditor();
    const insertContent = vi.fn(() => fakeEditor);
    fakeEditor.insertContent = insertContent;

    render(
      <EmojiPickerPopover
        editor={fakeEditor as never}
        open={true}
        onOpen={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(capturedOnEmojiSelect).not.toBeNull();
    });

    act(() => {
      capturedOnEmojiSelect!({ native: '🔥' });
    });

    expect(insertContent).toHaveBeenCalledWith('🔥');
  });
});
