/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiaryLeftPanel } from './DiaryLeftPanel';

// minimal stub for translation function
const t = (key: string) => key;

function makeProps(overrides = {}) {
  const base = {
    viewMode: 'list' as const,
    monthCursor: new Date(),
    setMonthCursor: () => {},
    selectedDate: null,
    entriesByDate: {} as Record<string, any>,
    handleSelectDate: () => {},
    loadingList: false,
    loadingEntry: false,
    entries: [],
    groupedEntries: [],
    setDeleteTargetDate: () => {},
    diaryTemperatureUnit: 'c' as const,
    dateLocale: 'en-US',
    t,
    resolveWeatherLabel: () => '',
  };
  return { ...base, ...overrides };
}

describe('DiaryLeftPanel', () => {
  it('shows list skeleton when loadingList is true', () => {
    const { container } = render(<DiaryLeftPanel {...makeProps({ loadingList: true })} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('diary.noEntries')).not.toBeInTheDocument();
  });

  it('shows list skeleton when loadingEntry is true', () => {
    const { container } = render(<DiaryLeftPanel {...makeProps({ loadingEntry: true })} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('diary.noEntries')).not.toBeInTheDocument();
  });

  it('renders "no entries" message when there are no entries and not loading', () => {
    render(<DiaryLeftPanel {...makeProps()} />);
    expect(screen.getByText('diary.noEntries')).toBeInTheDocument();
  });
});
