/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiaryPageClient from './DiaryPageClient';

// mocks for Next.js hooks used inside DiaryPageClient
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// simple stubs for internal hooks
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: 'en' }) }));

// mock motion/react similarly to avoid missing exports errors
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...((actual as any).motion ?? {}),
      div: 'div',
      aside: 'aside',
    },
  };
});
vi.mock('@/lib/settingsStore', () => ({
  useSettingsStore: () => ({ diaryLocationEnabled: false, diaryTemperatureUnit: 'c' }),
}));

// some of the sub-components are heavy; provide lightweight mocks so that
// we can focus on layout and header behavior. For the purposes of this test
// we only need the DOM structure, not full editing functionality.
vi.mock('./DiaryLeftPanel', () => ({ DiaryLeftPanel: () => <div data-testid="left-panel" /> }));
vi.mock('@/components/features/editor/EditorToolbar', () => ({
  EditorToolbar: () => <div data-testid="toolbar" />,
}));
vi.mock('@/components/features/editor/PageEditor', () => ({
  PageEditor: () => <div data-testid="editor" />,
}));
vi.mock('@/components/features/Workspace/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => null,
}));

// other UI components which may perform real DOM operations can be stubbed as
// simple fragments to avoid errors during rendering
vi.mock('@/components/shared/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <>{children}</>,
  AlertDialogAction: ({ children }: any) => <>{children}</>,
  AlertDialogCancel: ({ children }: any) => <>{children}</>,
  AlertDialogContent: ({ children }: any) => <>{children}</>,
  AlertDialogDescription: ({ children }: any) => <>{children}</>,
  AlertDialogFooter: ({ children }: any) => <>{children}</>,
  AlertDialogHeader: ({ children }: any) => <>{children}</>,
  AlertDialogTitle: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/shared/ui/dialog', () => ({
  Dialog: ({ children }: any) => <>{children}</>,
  DialogContent: ({ children }: any) => <>{children}</>,
  DialogDescription: ({ children }: any) => <>{children}</>,
  DialogHeader: ({ children }: any) => <>{children}</>,
  DialogTitle: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/shared/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

describe('DiaryPageClient header/loading behavior', () => {
  beforeEach(() => {
    // stub global fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/diary/journals') {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        // any other fetch returns an empty success by default
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );
  });

  it('renders loading skeleton in header and does not show create buttons when journals are empty', async () => {
    const { container } = render(<DiaryPageClient />);

    // initial header skeleton should be present because journals array starts empty
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    // main content buttons should not be visible while header is loading
    expect(screen.queryByText('diary.chooseDateCreate')).not.toBeInTheDocument();

    // eventually the component will attempt to fetch journals; since the stub
    // returns empty array the headerLoading condition remains true, so skeleton
    // should persist even after effect runs
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  it('collapses sidebar to tiny bar and keeps main content visible', async () => {
    // force desktop environment so mobile branch is skipped
    Object.defineProperty(globalThis, 'innerWidth', { value: 1024, writable: true });
    globalThis.dispatchEvent(new Event('resize'));

    const { container } = render(<DiaryPageClient />);

    // ensure title is rendered and click the hide button at the top of the sidebar
    expect(screen.getAllByText('sidebar.titleDiary').length).toBeGreaterThan(0);
    const toggle = container.querySelector('button[aria-label="sidebar.hide"]');
    expect(toggle).toBeInstanceOf(HTMLElement);

    // clicking should collapse; use fireEvent for reliability
    fireEvent.click(toggle as HTMLElement);

    // once collapsed the hide button itself should disappear
    await waitFor(() => {
      expect(screen.queryByLabelText('sidebar.hide')).not.toBeInTheDocument();
    });

    // main header skeleton remains rendered
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  }, 10000);

  it('on mobile the drawer can be opened and closed', async () => {
    // simulate mobile via matchMedia
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        const isDesktop = query.includes('min-width: 768px');
        return {
          matches: !isDesktop,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      },
    });

    render(<DiaryPageClient />);

    // open sidebar via mobile "show" button
    const openBtn = screen.getByRole('button', { name: /sidebar.show/ });
    await fireEvent.click(openBtn);

    // mobile drawer content should be rendered
    await waitFor(() => expect(screen.getByTestId('left-panel')).toBeInTheDocument());

    // toggle button inside drawer should close it
    const hideBtn = screen.getByRole('button', { name: /sidebar.hide/ });
    await fireEvent.click(hideBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('left-panel')).not.toBeInTheDocument();
    });

    // reopen again
    const openBtn2 = screen.getByRole('button', { name: /sidebar.show/ });
    await fireEvent.click(openBtn2);
    await waitFor(() => expect(screen.getByTestId('left-panel')).toBeInTheDocument());
  });
});
