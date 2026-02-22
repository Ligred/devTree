/** @vitest-environment happy-dom */
/**
 * DiagramBlock unit tests.
 *
 * Because ExcalidrawComponent is a heavy dynamic import we mock the entire
 * @excalidraw/excalidraw module. The mock exposes a thin stub that:
 *   - renders a simple <div data-testid="excalidraw"> so we can assert mount;
 *   - captures props so we can inspect what was passed;
 *   - exposes a fake imperative API via the excalidrawAPI callback.
 *
 * We test:
 *   1. Component renders without crashing.
 *   2. Correct props forwarded to Excalidraw.
 *   3. Scroll-parent refresh effect wires up scroll listeners.
 *   4. Hash-based library import calls updateLibrary + API.
 *   5. Backend library load on mount when authenticated.
 *   6. isDiagramBlockContent type guard.
 */

import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

// Mock next-themes so the component has a stable theme in tests
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// next-auth — default unauthenticated; tests override via mockReturnValue
const mockUseSession = vi.fn(() => ({
  status: 'unauthenticated' as string,
  data: null as { user: { id: string } } | null,
}));
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// parseLibraryTokensFromUrl mock — returns null by default (no hash)
const mockParseLibraryTokensFromUrl = vi.fn(
  () => null as null | { libraryUrl: string; idToken: string | null },
);

// Fake imperative API passed back via the excalidrawAPI callback
const fakeAPI = {
  refresh: vi.fn(),
  updateLibrary: vi.fn().mockResolvedValue([]),
};

// Captured Excalidraw props across renders
let capturedExcalidrawProps: Record<string, any> = {};

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: (props: Record<string, any>) => {
    capturedExcalidrawProps = props;
    if (typeof props.excalidrawAPI === 'function') {
      props.excalidrawAPI(fakeAPI);
    }
    return (
      <div
        data-testid="excalidraw"
        data-view-mode={String(props.viewModeEnabled)}
        data-theme={props.theme}
        data-lang={props.langCode}
      />
    );
  },
  parseLibraryTokensFromUrl: mockParseLibraryTokensFromUrl,
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { DiagramBlock } from './DiagramBlock';
import { isDiagramBlockContent } from '../types';

function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <I18nProvider>{children}</I18nProvider>;
}

const wrap = (ui: React.ReactElement) => render(<Wrapper>{ui}</Wrapper>);

const emptyContent = { code: '' };
const filledContent = {
  code: JSON.stringify({
    elements: [{ id: 'el1', type: 'rectangle' }],
    appState: { viewBackgroundColor: '#fff' },
  }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DiagramBlock', () => {
  beforeEach(() => {
    capturedExcalidrawProps = {};
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ status: 'unauthenticated', data: null });
    mockParseLibraryTokensFromUrl.mockReturnValue(null);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the Excalidraw canvas', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
  });

  it('forwards viewModeEnabled=true in view mode (default)', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('excalidraw')).toHaveAttribute('data-view-mode', 'true');
    });
  });

  it('forwards viewModeEnabled=false in edit mode', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);
    await waitFor(() => {
      expect(screen.getByTestId('excalidraw')).toHaveAttribute('data-view-mode', 'false');
    });
  });

  it('forwards theme=light when resolvedTheme is light', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('excalidraw')).toHaveAttribute('data-theme', 'light');
    });
  });

  it('parses initial elements from content.code', async () => {
    wrap(<DiagramBlock content={filledContent} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
    expect(capturedExcalidrawProps.initialData?.elements).toHaveLength(1);
    expect(capturedExcalidrawProps.initialData?.elements[0].type).toBe('rectangle');
  });

  it('uses empty elements when content.code is invalid JSON', async () => {
    wrap(<DiagramBlock content={{ code: '<<<not json' }} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
    expect(capturedExcalidrawProps.initialData?.elements).toEqual([]);
  });

  // ── Session-aware library loading ──────────────────────────────────────────

  it('does NOT fetch libraries when unauthenticated', async () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated', data: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());

    const libraryCalls = (fetchMock.mock.calls as [string, ...any[]][]).filter(
      ([url]) => typeof url === 'string' && url.includes('/api/user/libraries'),
    );
    expect(libraryCalls).toHaveLength(0);
  });

  it('fetches /api/user/libraries when authenticated', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'u1' } } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ libraries: [], localItems: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);

    await waitFor(() => {
      const calls = (fetchMock.mock.calls as [string, ...any[]][]).filter(
        ([url]) => typeof url === 'string' && url === '/api/user/libraries',
      );
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('merges backend library items via updateLibrary', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'u1' } } });
    const beItems = [{ id: 'li1', status: 'published', elements: [] }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ libraries: [{ items: beItems }], localItems: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(fakeAPI.updateLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ merge: true }),
      );
    });
  });

  // ── Hash-based library import ──────────────────────────────────────────────

  it('does NOT import library when URL has no #addLibrary hash', async () => {
    mockParseLibraryTokensFromUrl.mockReturnValue(null);
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
    const hashCalls = fakeAPI.updateLibrary.mock.calls.filter(
      ([args]: any[]) => args?.openLibraryMenu === true,
    );
    expect(hashCalls).toHaveLength(0);
  });

  it('calls updateLibrary and POSTs to backend on #addLibrary hash', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'u1' } } });
    mockParseLibraryTokensFromUrl.mockReturnValue({
      libraryUrl: 'https://libraries.excalidraw.com/test.excalidrawlib',
      idToken: 'tok123',
    });

    const libItems = [{ id: 'item1', status: 'published', elements: [] }];
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/user/libraries') {
        return Promise.resolve({ ok: true, json: async () => ({ libraries: [], localItems: [] }) });
      }
      if (url.includes('libraries.excalidraw.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            type: 'excalidrawlib',
            version: 2,
            libraryItems: libItems,
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);

    await waitFor(() => {
      expect(fakeAPI.updateLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          libraryItems: libItems,
          merge: true,
          openLibraryMenu: true,
        }),
      );
    });

    await waitFor(() => {
      const postCalls = (
        fetchMock.mock.calls as [string, RequestInit | undefined][]
      ).filter(([url, opts]) => url === '/api/user/libraries' && opts?.method === 'POST');
      expect(postCalls).toHaveLength(1);
    });
  });

  // ── Scroll coordinate refresh ──────────────────────────────────────────────

  it('calls refresh() when the page scrolls', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);

    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());

    // The refresh is called once on mount (RAF) and again on each scroll.
    // Dispatch a scroll event on window (our listener uses capture:true which
    // fires for scroll on any element in the document, simplest to dispatch
    // directly on window from the test).
    act(() => {
      globalThis.dispatchEvent(new Event('scroll'));
    });

    expect(fakeAPI.refresh).toHaveBeenCalled();
  });

  it('calls refresh() on pointer-down capture before Excalidraw processes the event', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());

    vi.clearAllMocks();

    // Fire a pointerdown on the Excalidraw mock element.  React dispatches the
    // capture-phase handler on the ancestor wrapper div before the target, so
    // handlePointerDownCapture runs — which calls excalidrawAPIRef.current.refresh() —
    // before Excalidraw would process the event.
    fireEvent.pointerDown(screen.getByTestId('excalidraw'));

    expect(fakeAPI.refresh).toHaveBeenCalledTimes(1);
  });

  // ── Local library persistence (onLibraryChange → PATCH) ──────────────────

  it('PATCHes local library items to backend when onLibraryChange fires', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'u1' } } });

    const urlItem = { id: 'url-item', elements: [] };
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/user/libraries' && !opts?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ libraries: [{ items: [urlItem] }], localItems: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());

    // Wait for the backend library load to finish so urlItemIdsRef is populated
    await waitFor(() => expect(fakeAPI.updateLibrary).toHaveBeenCalled());

    // The onLibraryChange prop must be wired to the Excalidraw component.
    expect(typeof capturedExcalidrawProps.onLibraryChange).toBe('function');

    // Simulate the user adding a local item from a file
    const newLocalItem = { id: 'local-item', elements: [{ type: 'rectangle' }] };
    act(() => capturedExcalidrawProps.onLibraryChange([urlItem, newLocalItem]));

    // Wait for the 1500ms debounce to fire naturally (test-level timeout is 10s)
    await waitFor(
      () => {
        const patchCalls = (fetchMock.mock.calls as [string, RequestInit | undefined][]).filter(
          ([url, opts]) => url === '/api/user/libraries' && opts?.method === 'PATCH',
        );
        expect(patchCalls).toHaveLength(1);
        const body = JSON.parse(patchCalls[0][1]!.body as string);
        // URL-sourced item should be excluded; only the local item should be patched
        expect(body.items).toHaveLength(1);
        expect(body.items[0].id).toBe('local-item');
      },
      { timeout: 5000 },
    );
  }, 8000);

  // ── Type guard ────────────────────────────────────────────────────────────

  it('isDiagramBlockContent recognises diagram blocks', () => {
    expect(isDiagramBlockContent({ code: '' }, 'diagram')).toBe(true);
    expect(isDiagramBlockContent({ code: '{}' }, 'diagram')).toBe(true);
  });

  it('isDiagramBlockContent rejects non-diagram content', () => {
    expect(isDiagramBlockContent({ code: 'x', language: 'js' } as never, 'diagram')).toBe(false);
    expect(isDiagramBlockContent({ code: '' }, 'code' as never)).toBe(false);
  });

  // ── Fullscreen button visibility ──────────────────────────────────────────

  it('shows fullscreen button in view mode (not editing)', async () => {
    // isEditing defaults to false, so the overlay button should render
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
  });

  it('shows fullscreen button in edit mode', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} isEditing />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());
    // In edit mode the button is rendered via renderTopRightUI prop on Excalidraw.
    // Our mock doesn't call renderTopRightUI, but we can verify the prop is provided.
    expect(typeof capturedExcalidrawProps.renderTopRightUI).toBe('function');
  });

  it('fullscreen button in view mode opens the fullscreen overlay', async () => {
    wrap(<DiagramBlock content={emptyContent} onChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('excalidraw')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Fullscreen'));

    // After clicking, the FullscreenBlockOverlay renders its <dialog open> element
    await waitFor(() => expect(document.querySelector('dialog[open]')).toBeInTheDocument());
    // And the button title changes to "Exit fullscreen"
    expect(screen.getByTitle('Exit fullscreen')).toBeInTheDocument();
  });
});


