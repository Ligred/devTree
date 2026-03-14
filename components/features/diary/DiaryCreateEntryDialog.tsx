'use client';
import { Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { useI18n } from '@/lib/i18n';

import { DiaryCalendar } from './DiaryCalendar';
import type { DiaryMeta } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  monthCursor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSetMonthDate: (date: Date) => void;
  entriesByDate: Record<string, DiaryMeta>;
  onConfirm: () => void;
  creatingEntry: boolean;
  dateLocale: string;
};

const primaryButtonClass =
  'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60';

export function DiaryCreateEntryDialog({
  open,
  onOpenChange,
  selectedDate,
  onSelectDate,
  monthCursor,
  onPrevMonth,
  onNextMonth,
  onSetMonthDate,
  entriesByDate,
  onConfirm,
  creatingEntry,
  dateLocale,
}: Readonly<Props>) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('diary.createEntryTitle')}
          </DialogTitle>
          <DialogDescription>{t('diary.createEntryDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-border rounded-xl border p-3">
            <DiaryCalendar
              monthDate={monthCursor}
              selectedDate={selectedDate}
              entriesByDate={entriesByDate}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
              onSetMonthDate={onSetMonthDate}
              onSelectDate={onSelectDate}
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
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-accent rounded-xl border px-3 py-2 text-sm"
            >
              {t('delete.cancel')}
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={onConfirm}
              disabled={!selectedDate || creatingEntry}
            >
              <Plus size={14} />
              {t('diary.createEntry')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
