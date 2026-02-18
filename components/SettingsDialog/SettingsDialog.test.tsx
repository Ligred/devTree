/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

import { SettingsDialog } from './SettingsDialog';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('SettingsDialog', () => {
  it('renders when open with theme and language options', () => {
    render(
      <Wrapper>
        <SettingsDialog open onOpenChange={() => {}} />
      </Wrapper>,
    );
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Ukrainian')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Wrapper>
        <SettingsDialog open={false} onOpenChange={() => {}} />
      </Wrapper>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
