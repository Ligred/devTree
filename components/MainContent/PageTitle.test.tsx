import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { PageTitle } from './PageTitle';
import type { Page } from './types';

const page: Page = {
  id: 'p1',
  title: 'My Page',
  blocks: [],
};

describe('PageTitle', () => {
  it('renders page title', () => {
    render(<PageTitle page={page} />);
    const input = screen.getByRole('textbox', { name: /page title/i });
    expect(input).toHaveValue('My Page');
    expect(input).toHaveAttribute('readOnly');
  });

  it('calls onTitleChange when editable and user types', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    render(
      <PageTitle page={page} readOnly={false} onTitleChange={onTitleChange} />,
    );
    const input = screen.getByRole('textbox', { name: /page title/i });
    expect(input).not.toHaveAttribute('readOnly');
    await user.clear(input);
    await user.type(input, 'New Title');
    expect(onTitleChange).toHaveBeenCalled();
  });

  it('has accessible label', () => {
    render(<PageTitle page={page} />);
    expect(screen.getByLabelText(/page title/i)).toBeInTheDocument();
  });
});
