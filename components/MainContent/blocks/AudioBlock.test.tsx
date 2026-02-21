/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { AudioBlock } from './AudioBlock';

function renderAudio(props: Partial<Parameters<typeof AudioBlock>[0]> = {}) {
  const defaults = {
    content: { url: '' },
    onChange: vi.fn(),
    isEditing: false,
    enterEdit: vi.fn(),
    exitEdit: vi.fn(),
  };
  const merged = { ...defaults, ...props } as Parameters<typeof AudioBlock>[0];
  return render(
    <I18nProvider>
      <AudioBlock {...merged} />
    </I18nProvider>,
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('AudioBlock – empty state', () => {
  it('shows "no audio" message when url is empty and not editing', () => {
    renderAudio({ content: { url: '' }, isEditing: false });
    expect(screen.getByText(/no audio yet/i)).toBeInTheDocument();
  });

  it('shows "Add audio URL" button in empty state', () => {
    renderAudio({ content: { url: '' }, isEditing: false });
    expect(screen.getByRole('button', { name: /add audio url/i })).toBeInTheDocument();
  });

  it('calls enterEdit when "Add audio URL" is clicked', async () => {
    const enterEdit = vi.fn();
    renderAudio({ content: { url: '' }, isEditing: false, enterEdit });

    await userEvent.click(screen.getByRole('button', { name: /add audio url/i }));

    expect(enterEdit).toHaveBeenCalledOnce();
  });
});

// ─── Edit mode ────────────────────────────────────────────────────────────────

describe('AudioBlock – edit mode', () => {
  it('renders URL input when isEditing=true', () => {
    renderAudio({ content: { url: '' }, isEditing: true });
    expect(screen.getByLabelText(/audio url/i)).toBeInTheDocument();
  });

  it('renders caption input when isEditing=true', () => {
    renderAudio({ content: { url: '' }, isEditing: true });
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
  });

  it('Save button is disabled when URL is empty', () => {
    renderAudio({ content: { url: '' }, isEditing: true });
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('Save button is enabled after typing a URL', async () => {
    renderAudio({ content: { url: '' }, isEditing: true });

    await userEvent.type(screen.getByLabelText(/audio url/i), 'https://example.com/audio.mp3');

    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });

  it('calls onChange with trimmed URL on Save', async () => {
    const onChange = vi.fn();
    const exitEdit = vi.fn();
    renderAudio({ content: { url: '' }, isEditing: true, onChange, exitEdit });

    await userEvent.type(
      screen.getByLabelText(/audio url/i),
      '  https://example.com/audio.mp3  ',
    );
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onChange).toHaveBeenCalledWith({ url: 'https://example.com/audio.mp3' });
    expect(exitEdit).toHaveBeenCalledOnce();
  });

  it('includes caption in onChange when provided', async () => {
    const onChange = vi.fn();
    renderAudio({ content: { url: '' }, isEditing: true, onChange });

    await userEvent.type(screen.getByLabelText(/audio url/i), 'https://example.com/a.mp3');
    await userEvent.type(screen.getByLabelText(/caption/i), 'My podcast');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onChange).toHaveBeenCalledWith({ url: 'https://example.com/a.mp3', caption: 'My podcast' });
  });

  it('calls exitEdit on Cancel', async () => {
    const exitEdit = vi.fn();
    renderAudio({ content: { url: 'https://example.com/audio.mp3' }, isEditing: true, exitEdit });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(exitEdit).toHaveBeenCalledOnce();
  });
});

// ─── Player view ──────────────────────────────────────────────────────────────

describe('AudioBlock – player view', () => {
  it('renders <audio> element with the given URL', () => {
    renderAudio({ content: { url: 'https://example.com/audio.mp3' }, isEditing: false });
    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute('src')).toBe('https://example.com/audio.mp3');
  });

  it('shows caption when provided', () => {
    renderAudio({
      content: { url: 'https://example.com/audio.mp3', caption: 'Episode 42' },
      isEditing: false,
    });
    expect(screen.getByText('Episode 42')).toBeInTheDocument();
  });

  it('does not show level bars when not playing (initial state)', () => {
    renderAudio({ content: { url: 'https://example.com/audio.mp3' }, isEditing: false });
    // .audio-bars div is not rendered when active=false
    const bars = document.querySelector('.audio-bars');
    expect(bars).not.toBeInTheDocument();
  });
});
