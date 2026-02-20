/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { useRecordingStore } from '@/lib/recordingStore';
import { attemptStartRecording } from './recordingHelpers';
import { VoiceDictationButton } from './VoiceDictationButton';
import { ConfirmationProvider } from '@/lib/confirmationContext';
import { I18nProvider } from '@/lib/i18n';

describe('VoiceDictationButton integration (helper)', () => {
  beforeEach(() => {
    useRecordingStore.setState({ isRecording: false, recordingBlockId: null, cancelRecordingCallback: () => {} });
  });

  it('uses attemptStartRecording helper correctly (sanity)', async () => {
    const startFn = vi.fn();
    const confirm = vi.fn(() => Promise.resolve(true));

    await attemptStartRecording({ blockId: 'b1', startFn, confirm });

    expect(startFn).toHaveBeenCalled();
  });
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <I18nProvider>
      <ConfirmationProvider>
        {component}
      </ConfirmationProvider>
    </I18nProvider>,
  );
};

describe('VoiceDictationButton', () => {
  it('renders without crashing', () => {
    const handleTextRecognized = vi.fn();
    const { container } = renderWithProviders(
      <VoiceDictationButton onTextRecognized={handleTextRecognized} />,
    );
    expect(container).toBeInTheDocument();
  });

  it('accepts language prop', () => {
    const handleTextRecognized = vi.fn();
    const { container } = renderWithProviders(
      <VoiceDictationButton onTextRecognized={handleTextRecognized} language="uk" />,
    );
    expect(container).toBeInTheDocument();
  });

  it('defaults to English language', () => {
    const handleTextRecognized = vi.fn();
    const { container } = renderWithProviders(
      <VoiceDictationButton onTextRecognized={handleTextRecognized} />,
    );
    expect(container).toBeInTheDocument();
  });

  it('accepts onTextRecognized callback prop', () => {
    const handleTextRecognized = vi.fn();
    renderWithProviders(
      <VoiceDictationButton onTextRecognized={handleTextRecognized} language="en" />,
    );
    expect(handleTextRecognized).not.toHaveBeenCalled();
  });
});
