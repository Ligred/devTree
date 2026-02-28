'use client';

import { useEffect, useRef, useState } from 'react';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { toDateOnly } from './diaryUtils';
import type { DiaryMeta } from './types';

interface DiaryCalendarProps {
  monthDate: Date;
  selectedDate: string | null;
  entriesByDate: Record<string, DiaryMeta>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSetMonthDate?: (date: Date) => void;
  onSelectDate: (dateOnly: string) => void;
  prevMonthLabel: string;
  nextMonthLabel: string;
  dateLocale: string;
  weekDayLabels: [string, string, string, string, string, string, string];
}

export function DiaryCalendar({
  monthDate,
  selectedDate,
  entriesByDate,
  onPrevMonth,
  onNextMonth,
  onSetMonthDate,
  onSelectDate,
  prevMonthLabel,
  nextMonthLabel,
  dateLocale,
  weekDayLabels,
}: Readonly<DiaryCalendarProps>) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ key: string; dateOnly: string | null }> = [];
  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ key: `empty-${year}-${month}-${i + 1}`, dateOnly: null });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const dateOnly = toDateOnly(new Date(year, month, day));
    cells.push({ key: dateOnly, dateOnly });
  }

  const today = toDateOnly(new Date());
  const years = Array.from({ length: 101 }, (_, index) => year - 80 + index);

  useEffect(() => {
    if (!showMonthMenu && !showYearMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showMonthMenu && monthMenuRef.current?.contains(target)) return;
      if (showYearMenu && yearMenuRef.current?.contains(target)) return;
      setShowMonthMenu(false);
      setShowYearMenu(false);
    };
    globalThis.addEventListener('mousedown', onPointerDown);
    return () => globalThis.removeEventListener('mousedown', onPointerDown);
  }, [showMonthMenu, showYearMenu]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="hover:bg-accent rounded p-1"
          onClick={onPrevMonth}
          aria-label={prevMonthLabel}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div ref={monthMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMonthMenu((prev) => !prev);
                setShowYearMenu(false);
              }}
              className="border-border bg-background hover:bg-accent inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs"
            >
              {new Date(year, month, 1).toLocaleDateString(dateLocale, { month: 'short' })}
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>

            {showMonthMenu && (
              <div className="border-border bg-popover absolute z-50 mt-1 max-h-50 w-28 overflow-y-auto rounded-md border p-1 shadow-md">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const isSelected = monthIndex === month;
                  return (
                    <button
                      key={monthIndex}
                      type="button"
                      disabled={isSelected}
                      onClick={() => {
                        if (onSetMonthDate) onSetMonthDate(new Date(year, monthIndex, 1));
                        setShowMonthMenu(false);
                      }}
                      className={cn(
                        'hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-xs disabled:cursor-default',
                        isSelected ? 'bg-accent text-accent-foreground' : '',
                      )}
                    >
                      {new Date(year, monthIndex, 1).toLocaleDateString(dateLocale, {
                        month: 'short',
                      })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={yearMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowYearMenu((prev) => !prev);
                setShowMonthMenu(false);
              }}
              className="border-border bg-background hover:bg-accent inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs"
            >
              {year}
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>

            {showYearMenu && (
              <div className="border-border bg-popover absolute z-50 mt-1 max-h-50 w-24 overflow-y-auto rounded-md border p-1 shadow-md">
                {years.map((yearOption) => {
                  const isSelected = yearOption === year;
                  return (
                    <button
                      key={yearOption}
                      type="button"
                      disabled={isSelected}
                      onClick={() => {
                        if (onSetMonthDate) onSetMonthDate(new Date(yearOption, month, 1));
                        setShowYearMenu(false);
                      }}
                      className={cn(
                        'hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-xs disabled:cursor-default',
                        isSelected ? 'bg-accent text-accent-foreground' : '',
                      )}
                    >
                      {yearOption}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="hover:bg-accent rounded p-1"
          onClick={onNextMonth}
          aria-label={nextMonthLabel}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="text-muted-foreground mb-1 grid grid-cols-7 gap-1 text-center text-xs">
        {weekDayLabels.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ key, dateOnly }) => {
          if (!dateOnly) return <div key={key} className="h-9" />;
          const selected = selectedDate === dateOnly;
          const hasEntry = Boolean(entriesByDate[dateOnly]);
          const isToday = dateOnly === today;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(dateOnly)}
              disabled={selected}
              className={cn(
                'hover:bg-accent relative h-9 rounded-md text-sm disabled:cursor-default disabled:hover:bg-transparent',
                selected && 'bg-accent text-accent-foreground font-semibold',
                !selected && isToday && 'ring-primary ring-1',
              )}
              title={new Date(dateOnly).toLocaleDateString(dateLocale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            >
              {Number(dateOnly.slice(-2))}
              {hasEntry && (
                <span
                  className={cn(
                    'absolute right-1 bottom-1 h-1.5 w-1.5 rounded-full',
                    selected ? 'bg-accent-foreground' : 'bg-primary',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
