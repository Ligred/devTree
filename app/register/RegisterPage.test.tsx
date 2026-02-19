/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import RegisterPage from './page';

describe('RegisterPage', () => {
  it('shows redirect message and redirects to login with mode=register', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login?mode=register');
  });
});
