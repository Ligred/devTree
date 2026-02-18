/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeAll } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { WhiteboardBlock } from './WhiteboardBlock';

/**
 * HTMLCanvasElement is not fully implemented in happy-dom.
 * We provide a minimal mock so the component can mount and the canvas ref
 * resolves without throwing.
 */
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  }));
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,FAKE');
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('WhiteboardBlock', () => {
  it('renders the canvas element', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} />,
      { wrapper },
    );
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('shows the empty-state overlay in view mode when content is blank', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText(/empty whiteboard/i)).toBeInTheDocument();
  });

  it('hides the empty-state overlay when content has a dataUrl', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: 'data:image/png;base64,FAKE' }} onChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByText(/empty whiteboard/i)).not.toBeInTheDocument();
  });

  it('hides the toolbar in view mode (default)', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByTitle(/pen/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/eraser/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clear/i)).not.toBeInTheDocument();
  });

  it('shows the toolbar in edit mode', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} isEditing />,
      { wrapper },
    );
    expect(screen.getByTitle('Pen')).toBeInTheDocument();
    expect(screen.getByTitle('Eraser')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('canvas has cursor-crosshair class in edit mode', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} isEditing />,
      { wrapper },
    );
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveClass('cursor-crosshair');
  });

  it('canvas has cursor-default class in view mode', () => {
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={vi.fn()} />,
      { wrapper },
    );
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveClass('cursor-default');
  });

  it('calls onChange with dataUrl after a stroke (mouseUp)', () => {
    const onChange = vi.fn();
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={onChange} isEditing />,
      { wrapper },
    );
    const canvas = document.querySelector('canvas')!;
    // Simulate a stroke: mouseDown → mouseUp
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);
    expect(onChange).toHaveBeenCalledWith({ dataUrl: 'data:image/png;base64,FAKE' });
  });

  it('does not call onChange on mouseUp in view mode', () => {
    const onChange = vi.fn();
    render(
      <WhiteboardBlock content={{ dataUrl: '' }} onChange={onChange} />,
      { wrapper },
    );
    const canvas = document.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);
    // In view mode isPointerDown never becomes true, so onChange is not called
    expect(onChange).not.toHaveBeenCalled();
  });
});
