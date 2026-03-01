/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from './Sidebar';

// motion animations can be reduced for tests
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      ...(actual).motion,
      div: 'div',
      aside: 'aside',
    },
  };
});

describe('Sidebar component', () => {
  it('displays children and calls onShow when collapsed overlay is clicked', async () => {
    const onShow = vi.fn();
    const transition = { duration: 0.01 };

    const { rerender } = render(
      <Sidebar visible={true} onShow={onShow} transition={transition}>
        <div data-testid="inner">hello</div>
      </Sidebar>,
    );

    expect(screen.getByTestId('inner')).toBeInTheDocument();

    // collapse
    rerender(
      <Sidebar visible={false} onShow={onShow} transition={transition}>
        <div data-testid="inner">hello</div>
      </Sidebar>,
    );

    // button should now be in the DOM synchronously
    const button = screen.getByLabelText('Show sidebar');
    await userEvent.click(button);
    expect(onShow).toHaveBeenCalledTimes(1);

    // inner wrapper should preserve minimum width so it doesn't shrink
    const innerWrapper = screen.getByTestId('inner').parentElement;
    expect(innerWrapper).toHaveClass('md:min-w-[256px]');
  });

  it('renders a mobile drawer and backdrop when mobileOverlay.open is true and closes on backdrop click', async () => {
    const onClose = vi.fn();
    const transition = { duration: 0.01 };

    render(
      <Sidebar
        visible={true}
        onShow={() => {}}
        transition={transition}
        mobileOverlay={{ open: true, onClose }}
      >
        <div data-testid="mobile-content">mobile</div>
      </Sidebar>,
    );

    // mobile content should be present (desktop version may also be rendered
    // but hidden via CSS, so there could be duplicates)
    const mobileContents = screen.getAllByTestId('mobile-content');
    expect(mobileContents.length).toBeGreaterThan(0);
    expect(mobileContents[0]).toBeInTheDocument();

    // ensure the drawer and backdrop exist
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    const backdropEl = screen.getByTestId('mobile-sidebar-backdrop');
    expect(backdropEl).toBeInTheDocument();

    // click backdrop should call onClose
    await userEvent.click(backdropEl);
    expect(onClose).toHaveBeenCalled();
  });
});
