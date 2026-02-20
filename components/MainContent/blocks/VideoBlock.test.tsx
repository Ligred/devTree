/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { VideoBlock, parseVideoUrl } from './VideoBlock';

describe('VideoBlock', () => {
  it('shows edit form when url is empty', () => {
    render(<VideoBlock content={{ url: '' }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/youtube\.com\/watch/i)).toBeInTheDocument();
  });

  it('saves a trimmed URL', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<VideoBlock content={{ url: '' }} onChange={onChange} />);

    await user.type(
      screen.getByPlaceholderText(/youtube\.com\/watch/i),
      '  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ',
    );
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onChange).toHaveBeenCalledWith({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });

  it('renders iframe for supported YouTube links', () => {
    render(
      <VideoBlock
        content={{ url: 'https://youtu.be/dQw4w9WgXcQ?si=abc' }}
        onChange={vi.fn()}
      />,
    );

    const frame = screen.getByTestId('video-block-iframe');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('src', expect.stringContaining('/embed/dQw4w9WgXcQ'));
  });

  it('falls back to external link for unsupported providers', () => {
    render(
      <VideoBlock
        content={{ url: 'https://vimeo.com/148751763' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/saved video url/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vimeo/i })).toHaveAttribute(
      'href',
      'https://vimeo.com/148751763',
    );
    expect(screen.queryByTestId('video-block-iframe')).not.toBeInTheDocument();
  });
});

describe('parseVideoUrl', () => {
  it('supports youtube watch links', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube');
    expect(result.embedUrl).toContain('/embed/dQw4w9WgXcQ');
  });

  it('supports youtu.be links', () => {
    const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube');
    expect(result.embedUrl).toContain('/embed/dQw4w9WgXcQ');
  });

  it('returns unknown for non-youtube links', () => {
    const result = parseVideoUrl('https://vimeo.com/148751763');
    expect(result).toEqual({ provider: 'unknown', embedUrl: null });
  });
});
