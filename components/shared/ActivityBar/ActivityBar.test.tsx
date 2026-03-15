/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityBar } from './ActivityBar';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/statistics',
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/stores/uiStore', () => ({
  useUIStore: () => ({ openSettings: vi.fn() }),
}));

vi.mock('@/lib/stores/statsStore', () => ({
  useStatsStore: () => ({ enabled: true }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'nav.notebook') return 'Notebook';
      if (key === 'nav.statistics') return 'Statistics';
      if (key === 'nav.diary') return 'Diary';
      if (key === 'nav.settings') return 'Settings';
      return key;
    },
  }),
}));

describe('ActivityBar', () => {
  beforeEach(() => {
    pushMock.mockReset();
    globalThis.localStorage.clear();
  });

  it('opens notebook with last-opened page query when memory exists', async () => {
    globalThis.localStorage.setItem('devtree:lastNotebookPageId', 'page-123');
    const user = userEvent.setup();

    render(<ActivityBar />);
    await user.click(screen.getByRole('button', { name: 'Notebook' }));

    expect(pushMock).toHaveBeenCalledWith('/notebook?page=page-123');
  });

  it('opens plain notebook route when no last-opened page is stored', async () => {
    const user = userEvent.setup();

    render(<ActivityBar />);
    await user.click(screen.getByRole('button', { name: 'Notebook' }));

    expect(pushMock).toHaveBeenCalledWith('/notebook');
  });

  it('uses horizontally scrollable mobile tab bar layout', () => {
    const { container } = render(<ActivityBar />);
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('overflow-x-auto');

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toHaveClass('shrink-0');
    }
  });
});
