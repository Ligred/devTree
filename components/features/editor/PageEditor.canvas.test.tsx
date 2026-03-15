/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Extension } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';

import { PageEditor } from './PageEditor';

vi.mock('./BlockControls', () => ({
  BlockControls: () => null,
  BlockPickerMenu: () => null,
}));

vi.mock('./EditorBubbleMenu', () => ({
  EditorBubbleMenu: () => null,
}));

vi.mock('tiptap-extension-global-drag-handle', () => ({
  __esModule: true,
  default: Extension.create({ name: 'mockGlobalDragHandle' }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// make sure any component using useI18n works without provider
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'en', setLocale: () => {} }),
}));

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw" />,
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    function MockDynamic() {
      return <div data-testid="mock-excalidraw" />;
    }
    return MockDynamic;
  },
}));

describe('PageEditor canvas block', () => {
  it('opens and closes fullscreen overlay from canvas block toggle', async () => {
    const user = userEvent.setup();

    if (typeof document.elementsFromPoint !== 'function') {
      document.elementsFromPoint = () => [];
    }

    render(
      <PageEditor
        key="canvas"
        editable
        content={{
          type: 'doc',
          content: [
            {
              type: 'canvasNode',
              attrs: { data: '', tags: [] },
            },
          ],
        }}
      />,
    );

    const toggle = await screen.findByTestId('canvas-fullscreen-toggle');
    await user.click(toggle);

    expect(screen.getByTestId('canvas-fullscreen-overlay')).toBeInTheDocument();

    await user.click(screen.getByTestId('canvas-fullscreen-toggle'));

    expect(screen.queryByTestId('canvas-fullscreen-overlay')).not.toBeInTheDocument();
  });
});
