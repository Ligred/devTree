'use client';

import { DiaryCalendar } from './DiaryCalendar';
import { DiaryTimelineList } from './DiaryTimelineList';
import type { DiaryMeta, DiaryTranslate, DiaryViewMode } from './types';

type LeftPanelProps = {
  viewMode: DiaryViewMode;
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  selectedDate: string | null;
  entriesByDate: Record<string, DiaryMeta>;
  handleSelectDate: (dateOnly: string) => void;
  loadingList: boolean;
  entries: DiaryMeta[];
  groupedEntries: Array<{ month: string; items: DiaryMeta[] }>;
  setDeleteTargetDate: (dateOnly: string) => void;
  diaryTemperatureUnit: 'c' | 'f';
  dateLocale: string;
  t: DiaryTranslate;
  resolveWeatherLabel: (weatherCode?: number | null, fallback?: string | null) => string;
};

export function DiaryLeftPanel({
  viewMode,
  monthCursor,
  setMonthCursor,
  selectedDate,
  entriesByDate,
  handleSelectDate,
  loadingList,
  entries,
  groupedEntries,
  setDeleteTargetDate,
  diaryTemperatureUnit,
  dateLocale,
  t,
  resolveWeatherLabel,
}: Readonly<LeftPanelProps>) {
  if (viewMode !== 'list') {
    return (
      <DiaryCalendar
        monthDate={monthCursor}
        selectedDate={selectedDate}
        entriesByDate={entriesByDate}
        onPrevMonth={() =>
          setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
        }
        onNextMonth={() =>
          setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
        }
        onSetMonthDate={(nextDate) => setMonthCursor(nextDate)}
        onSelectDate={handleSelectDate}
        prevMonthLabel={t('diary.prevMonth')}
        nextMonthLabel={t('diary.nextMonth')}
        dateLocale={dateLocale}
        weekDayLabels={[
          t('diary.weekday.su'),
          t('diary.weekday.mo'),
          t('diary.weekday.tu'),
          t('diary.weekday.we'),
          t('diary.weekday.th'),
          t('diary.weekday.fr'),
          t('diary.weekday.sa'),
        ]}
      />
    );
  }

  if (loadingList) {
    return (
      <div className="p-6">
        <div className="bg-muted h-40 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
        {t('diary.noEntries')}
      </div>
    );
  }

  return (
    <DiaryTimelineList
      groupedEntries={groupedEntries}
      selectedDate={selectedDate}
      onSelectDate={handleSelectDate}
      onDeleteDate={(dateOnly) => setDeleteTargetDate(dateOnly)}
      temperatureUnit={diaryTemperatureUnit}
      dateLocale={dateLocale}
      weatherCodeLabel={t('diary.weatherCode')}
      noTextLabel={t('diary.noTextYet')}
      hasContentLabel={t('diary.entryContent')}
      deleteLabel={t('diary.deleteEntryLabel')}
      resolveWeatherLabel={resolveWeatherLabel}
    />
  );
}
