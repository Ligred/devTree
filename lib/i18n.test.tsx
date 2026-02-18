/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { I18nProvider, useI18n } from './i18n';

function TestConsumer() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div>
      <span data-testid="main.selectPage">{t('main.selectPage')}</span>
      <span data-testid="main.save">{t('main.save')}</span>
      <span data-testid="locale">{locale}</span>
      <button type="button" onClick={() => setLocale('uk')}>
        Set UK
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        Set EN
      </button>
      <span data-testid="param">{t('delete.pageDescription', { name: 'My Page' })}</span>
    </div>
  );
}

describe('I18n', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
  });

  it('provides default English translations', () => {
    const { container } = render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    const withinContainer = (id: string) => container.querySelector(`[data-testid="${id}"]`);
    expect(withinContainer('main.selectPage')).toHaveTextContent(
      'Select or create a page',
    );
    expect(withinContainer('main.save')).toHaveTextContent('Save');
  });

  it('replaces params in t()', () => {
    const { container } = render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    const param = container.querySelector('[data-testid="param"]');
    expect(param).toHaveTextContent('"My Page" will be permanently removed.');
  });

  it('switches locale when setLocale is called', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    const getByTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`);
    const getByRole = (name: string) =>
      Array.from(container.querySelectorAll('button')).find((el) => el.textContent === name);
    expect(getByTestId('locale')).toHaveTextContent('en');
    await user.click(getByRole('Set UK')!);
    expect(getByTestId('locale')).toHaveTextContent('uk');
    expect(getByTestId('main.selectPage')).toHaveTextContent(
      'Виберіть або створіть сторінку',
    );
    await user.click(getByRole('Set EN')!);
    expect(getByTestId('locale')).toHaveTextContent('en');
  });
});
