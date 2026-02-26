/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RegisterPage from './page';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('RegisterPage', () => {
  it('shows redirect message and redirects to login with mode=register', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login?mode=register');
  });
});
