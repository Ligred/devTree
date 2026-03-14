/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorToolbar, ToolbarButton } from './EditorToolbar';

vi.mock('motion/react', () => {
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        initial,
        animate,
        exit,
        ...props
      }: { children?: React.ReactNode } & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      ),
    },
    useReducedMotion: () => false,
  };
});

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'en' }),
}));

vi.mock('@/components/features/MainContent/voice-dictation/VoiceDictationButton', () => ({
  VoiceDictationButton: () => <button type="button">Voice Dictation</button>,
}));

vi.mock('@/components/features/MainContent/voice-dictation/VoiceDictationLanguageButton', () => ({
  VoiceDictationLanguageButton: () => <button type="button">Dictation Language</button>,
}));

vi.mock('./BookmarksPanel', () => ({
  BookmarksPanel: () => <div data-testid="bookmarks-panel">Bookmarks</div>,
}));

type ActiveMap = Record<string, boolean>;

function createEditorMock(active: ActiveMap = {}, selectionEmpty = false) {
  const chainCalls: Array<{ name: string; args: unknown[] }> = [];

  const chainProxy = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return (...args: unknown[]) => {
          chainCalls.push({ name: prop, args });
          return chainProxy;
        };
      },
    },
  );

  const editor = {
    state: {
      selection: {
        empty: selectionEmpty,
        from: 2,
        to: selectionEmpty ? 2 : 6,
      },
      doc: {
        content: { size: 100 },
        textBetween: vi.fn(() => 'Selected text'),
      },
    },
    view: {
      coordsAtPos: vi.fn(() => ({ left: 100, bottom: 160 })),
    },
    commands: {
      insertContentAt: vi.fn(),
    },
    getAttributes: vi.fn((name: string) => {
      if (name === 'link') return { href: '' };
      if (name === 'highlight') return { color: '' };
      if (name === 'textStyle') return { color: '' };
      if (name === 'comment') return { commentText: '' };
      return {};
    }),
    isActive: vi.fn((nameOrAttrs: string | Record<string, unknown>) => {
      if (typeof nameOrAttrs === 'string') return !!active[nameOrAttrs];
      return false;
    }),
    chain: vi.fn(() => {
      chainCalls.push({ name: 'chain', args: [] });
      return chainProxy;
    }),
  };

  return { editor, chainCalls };
}

describe('ToolbarButton', () => {
  it('calls onClick on mouse down', () => {
    const onClick = vi.fn();
    render(
      <ToolbarButton title="Bold" onClick={onClick}>
        B
      </ToolbarButton>,
    );

    fireEvent.mouseDown(screen.getByTitle('Bold'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('EditorToolbar', () => {
  it('applies selected text color and closes popup', async () => {
    const { editor, chainCalls } = createEditorMock();

    render(<EditorToolbar editor={editor as never} blockId="block-1" />);

    fireEvent.mouseDown(screen.getByTitle('Text color'));
    fireEvent.mouseDown(await screen.findByRole('button', { name: 'Red' }));

    expect(chainCalls).toContainEqual({ name: 'setColor', args: ['#dc2626'] });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Red' })).not.toBeInTheDocument();
    });
  });

  it('applies link url from popup input', async () => {
    const { editor, chainCalls } = createEditorMock();

    render(<EditorToolbar editor={editor as never} blockId="block-2" />);

    fireEvent.mouseDown(screen.getByTitle('Add link'));

    const urlInput = await screen.findByPlaceholderText('https://');
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Apply' }));

    expect(chainCalls).toContainEqual({
      name: 'setLink',
      args: [{ href: 'https://example.com' }],
    });
  });

  it('restores prior selection when link popup collapses cursor', async () => {
    const { editor, chainCalls } = createEditorMock();

    render(<EditorToolbar editor={editor as never} blockId="block-4" />);

    // initial mock selection is {from:2,to:6}
    fireEvent.mouseDown(screen.getByTitle('Add link'));
    // simulate loss of selection (e.g. toolbar click moved cursor)
    editor.state.selection = { empty: true, from: 0, to: 0 } as any;

    const urlInput = await screen.findByPlaceholderText('https://');
    fireEvent.change(urlInput, { target: { value: 'https://restore.com' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Apply' }));

    expect(chainCalls).toContainEqual({
      name: 'setTextSelection',
      args: [{ from: 2, to: 6 }],
    });
  });

  it('opens bookmarks panel when selection is empty', async () => {
    const { editor } = createEditorMock({}, true);

    render(<EditorToolbar editor={editor as never} blockId="block-3" />);
    fireEvent.mouseDown(screen.getByTitle('Bookmarks'));

    expect(await screen.findByTestId('bookmarks-panel')).toBeInTheDocument();
  });

  it('renders bookmarks popup above controls layer', async () => {
    const { editor } = createEditorMock({}, true);

    const { container } = render(<EditorToolbar editor={editor as never} blockId="block-3b" />);
    fireEvent.mouseDown(screen.getByTitle('Bookmarks'));

    const bookmarksPanel = await screen.findByTestId('bookmarks-panel');
    const popupContainer = bookmarksPanel.parentElement;

    expect(popupContainer).toHaveClass('z-50');
    expect(container.querySelector('div.fixed.inset-0.z-40')).toBeInTheDocument();
  });

  it('applies comment text from popup', async () => {
    const { editor, chainCalls } = createEditorMock();

    render(<EditorToolbar editor={editor as never} blockId="block-4" />);

    fireEvent.mouseDown(screen.getByTitle('Add comment'));
    const textarea = await screen.findByPlaceholderText('Add a note…');
    fireEvent.change(textarea, { target: { value: 'My editor note' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Apply' }));

    expect(chainCalls).toContainEqual({
      name: 'setComment',
      args: [expect.objectContaining({ commentText: 'My editor note' })],
    });
  });

  it('opens font family dropdown and applies selection', async () => {
    const { editor, chainCalls } = createEditorMock();
    const { container } = render(<EditorToolbar editor={editor as never} blockId="block-font" />);

    // stub the button's bounding rect so the portal can compute a nonzero position
    const btn = screen.getByTitle('Font family');
    btn.getBoundingClientRect = () => ({
      left: 123,
      bottom: 456,
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => '',
    });

    fireEvent.mouseDown(btn);
    const option = await screen.findByText('Arial');

    // portal wrapper should have used the coords above
    const wrapper = option.closest('div[style]');
    expect(wrapper).toHaveStyle({ position: 'fixed', top: '460px', left: '123px' });

    expect(option.closest('body')).toBe(document.body);
    expect(container).not.toContainElement(option);

    fireEvent.mouseDown(option);
    expect(chainCalls).toContainEqual({ name: 'setFontFamily', args: ['Arial, sans-serif'] });
  });

  it('opens font size dropdown and applies selection', async () => {
    const { editor, chainCalls } = createEditorMock();
    const { container } = render(
      <EditorToolbar editor={editor as never} blockId="block-fontsize" />,
    );

    fireEvent.mouseDown(screen.getByTitle('Font size'));
    const option = await screen.findByText('16');

    expect(option.closest('body')).toBe(document.body);
    expect(container).not.toContainElement(option);

    fireEvent.mouseDown(option);
    expect(chainCalls).toContainEqual({ name: 'setFontSize', args: ['16px'] });
  });

  it('opens heading dropdown and toggles heading', async () => {
    const { editor, chainCalls } = createEditorMock();
    const { container } = render(
      <EditorToolbar editor={editor as never} blockId="block-heading" />,
    );

    // stub coords for heading button too
    const btn = screen.getByTitle('Heading');
    btn.getBoundingClientRect = () => ({
      left: 50,
      bottom: 80,
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => '',
    });

    fireEvent.mouseDown(btn);
    const h2button = await screen.findByText('H2');

    const wrapper = h2button.closest('div[style]');
    expect(wrapper).toHaveStyle({ position: 'fixed', top: '84px', left: '50px' });

    expect(h2button.closest('body')).toBe(document.body);
    expect(container).not.toContainElement(h2button);

    fireEvent.mouseDown(h2button);
    expect(chainCalls).toContainEqual({ name: 'toggleHeading', args: [{ level: 2 }] });
  });

  it('opens alignment dropdown and applies justify', async () => {
    const { editor, chainCalls } = createEditorMock();
    render(<EditorToolbar editor={editor as never} blockId="block-align" />);

    fireEvent.mouseDown(screen.getByTitle('Text alignment'));
    const justifyBtn = await screen.findByText('Justify');
    fireEvent.mouseDown(justifyBtn);

    expect(chainCalls).toContainEqual({ name: 'setTextAlign', args: ['justify'] });
  });

  it('allows picking a custom text color via color input', async () => {
    const { editor, chainCalls } = createEditorMock();
    render(<EditorToolbar editor={editor as never} blockId="block-color" />);

    fireEvent.mouseDown(screen.getByTitle('Text color'));
    const input = await screen.findByLabelText('Custom', { selector: 'input[type=color]' });
    fireEvent.change(input, { target: { value: '#abcdef' } });

    expect(chainCalls).toContainEqual({ name: 'setColor', args: ['#abcdef'] });
  });

  it('allows picking a custom highlight color via color input', async () => {
    const { editor, chainCalls } = createEditorMock();
    render(<EditorToolbar editor={editor as never} blockId="block-highlight" />);

    fireEvent.mouseDown(screen.getByTitle('Highlight'));
    const input = await screen.findByLabelText('Custom', { selector: 'input[type=color]' });
    fireEvent.change(input, { target: { value: '#123456' } });

    expect(chainCalls).toContainEqual({ name: 'toggleHighlight', args: [{ color: '#123456' }] });
  });

  it('adds bookmark on selected text', () => {
    const { editor, chainCalls } = createEditorMock({}, false);

    render(<EditorToolbar editor={editor as never} blockId="block-5" />);
    fireEvent.mouseDown(screen.getByTitle('Bookmarks'));

    expect(chainCalls).toContainEqual({
      name: 'setBookmark',
      args: [expect.objectContaining({ label: 'Selected text' })],
    });
  });
});
