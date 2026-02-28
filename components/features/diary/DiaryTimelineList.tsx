'use client';
/* eslint-disable @next/next/no-img-element */
import { Trash2 } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { formatDateLong, parseLocalDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

import { formatTemp, getWeatherIcon } from './diaryUtils';
import type { DiaryMeta } from './types';

interface DiaryTimelineListProps {
  groupedEntries: Array<{ month: string; items: DiaryMeta[] }>;
  selectedDate: string | null;
  onSelectDate: (dateOnly: string) => void;
  onDeleteDate: (dateOnly: string) => void;
  temperatureUnit: 'c' | 'f';
  dateLocale: string;
  weatherCodeLabel: string;
  noTextLabel: string;
  hasContentLabel: string;
  deleteLabel: string;
  resolveWeatherLabel: (weatherCode?: number | null, fallback?: string | null) => string;
}

export function DiaryTimelineList({
  groupedEntries,
  selectedDate,
  onSelectDate,
  onDeleteDate,
  temperatureUnit,
  dateLocale,
  weatherCodeLabel,
  noTextLabel,
  hasContentLabel,
  deleteLabel,
  resolveWeatherLabel,
}: Readonly<DiaryTimelineListProps>) {
  return (
    <div className="space-y-4">
      {groupedEntries.map((group) => (
        <section key={group.month}>
          <p className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wide uppercase">
            {group.month}
          </p>
          <ul className="space-y-2">
            {group.items.map((entry) => {
              const selected = entry.entryDate === selectedDate;
              const weatherIcon =
                typeof entry.weatherCode === 'number' ? getWeatherIcon(entry.weatherCode) : null;

              return (
                <li key={entry.entryDate}>
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelectDate(entry.entryDate)}
                      disabled={selected}
                      className={cn(
                        'border-border bg-card/70 hover:bg-accent/60 hover:border-primary/30 disabled:hover:bg-card/70 disabled:hover:border-border w-full rounded-xl border px-3 py-2.5 pr-10 text-left shadow-xs transition-colors disabled:cursor-default',
                        selected ? 'ring-primary/30 bg-accent border-primary/35 ring-2' : '',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {formatDateLong(parseLocalDate(entry.entryDate), dateLocale)}
                          </p>
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                            {entry.previewText?.trim() ||
                              (entry.hasContent ? hasContentLabel : noTextLabel)}
                          </p>
                          {entry.locationShort && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                              {entry.locationShort}
                            </p>
                          )}
                        </div>
                        {entry.previewImage && (
                          <img
                            src={entry.previewImage}
                            alt=""
                            className="border-border h-10 w-10 shrink-0 rounded-md border object-cover"
                          />
                        )}
                        {weatherIcon && typeof entry.weatherTempC === 'number' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium whitespace-nowrap">
                                {weatherIcon} {formatTemp(entry.weatherTempC, temperatureUnit)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">
                                {resolveWeatherLabel(entry.weatherCode, entry.weatherLabel)}
                              </p>
                              <p className="text-xs opacity-90">
                                {formatTemp(entry.weatherTempC, 'c')} ·{' '}
                                {formatTemp(entry.weatherTempC, 'f')}
                              </p>
                              <p className="text-xs opacity-90">
                                {weatherCodeLabel}: {entry.weatherCode}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-label={deleteLabel}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteDate(entry.entryDate);
                      }}
                      className={cn(
                        'bg-background/95 text-muted-foreground hover:text-destructive border-border absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md border transition-opacity',
                        'opacity-0 group-hover:opacity-100',
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
