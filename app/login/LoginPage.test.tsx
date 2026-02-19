/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { I18nProvider } from '@/lib/i18n';
import LoginPage from './page';
import { signIn } from 'next-auth/react';

function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <I18nProvider initialLocale="en">{children}</I18nProvider>;
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
  });

  it('renders sign in form with email and password inputs', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /forgot/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('renders sign up button to switch to register mode', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders OAuth buttons for Google and GitHub', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('submits credentials on form submit', async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true, error: null, status: 200, url: '/' } as never);
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
      email: 'test@example.com',
      password: 'password123',
      redirect: false,
    }));
  });
});
