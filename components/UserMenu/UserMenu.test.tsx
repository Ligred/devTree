/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

import { UserMenu } from './UserMenu';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test', email: 'test@example.com' } }, status: 'authenticated' }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('UserMenu', () => {
  it('renders trigger button', () => {
    const onOpenSettings = vi.fn();
    render(
      <Wrapper>
        <UserMenu onOpenSettings={onOpenSettings} />
      </Wrapper>,
    );
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('opens dropdown and shows Settings, calls onOpenSettings when Settings is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(
      <Wrapper>
        <UserMenu onOpenSettings={onOpenSettings} />
      </Wrapper>,
    );
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    const settingsItem = screen.getByRole('menuitem', { name: /settings/i });
    expect(settingsItem).toBeInTheDocument();
    await user.click(settingsItem);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
