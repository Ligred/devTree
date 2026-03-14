'use client';
import { useRef, useState } from 'react';

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
  PanelLeftClose,
  Pencil,
  Plus,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { DiaryLeftPanel } from './DiaryLeftPanel';
import { getWeatherLabel, getWeatherLabelKey } from './diaryUtils';
import type { DiaryJournal, DiaryMeta, DiaryViewMode } from './types';

type Props = {
  // Journal management
  journals: DiaryJournal[];
  activeJournalId: string | null;
  activeJournal: DiaryJournal | null;
  setActiveJournalId: (id: string) => void;
  createJournal: (name: string) => Promise<DiaryJournal | null>;
  renameJournal: (name: string) => Promise<boolean>;
  // Sidebar visibility
  effectiveVisible: boolean;
  isMobile: boolean;
  setSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  // View mode
  viewMode: DiaryViewMode;
  setViewMode: (mode: DiaryViewMode) => void;
  // Entry list
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  selectedDate: string | null;
  entriesByDate: Record<string, DiaryMeta>;
  entries: DiaryMeta[];
  groupedEntries: Array<{ month: string; items: DiaryMeta[] }>;
  handleSelectDate: (date: string) => void;
  loadingList: boolean;
  loadingEntry: boolean;
  setDeleteTargetDate: React.Dispatch<React.SetStateAction<string | null>>;
  diaryTemperatureUnit: 'c' | 'f';
  dateLocale: string;
  // Entry creation
  todayEntryExists: boolean;
  creatingEntry: boolean;
  onCreateToday: () => void;
  onOpenCreateDateDialog: () => void;
  // Template manager
  onOpenTemplateManager: () => void;
  // Errors
  error: string | null;
};

const primaryButtonClass =
  'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60';
const actionButtonClass =
  'border-border bg-card hover:bg-accent/70 hover:border-primary/35 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-xs transition-colors';
const toggleActiveClass = 'bg-accent text-accent-foreground';
const toggleInactiveClass = 'text-muted-foreground';

export function DiarySidebarContent({
  journals,
  activeJournalId,
  activeJournal,
  setActiveJournalId,
  createJournal,
  renameJournal,
  effectiveVisible,
  isMobile,
  setSidebarVisible,
  setMobileSidebarVisible,
  viewMode,
  setViewMode,
  monthCursor,
  setMonthCursor,
  selectedDate,
  entriesByDate,
  entries,
  groupedEntries,
  handleSelectDate,
  loadingList,
  loadingEntry,
  setDeleteTargetDate,
  diaryTemperatureUnit,
  dateLocale,
  todayEntryExists,
  creatingEntry,
  onCreateToday,
  onOpenCreateDateDialog,
  onOpenTemplateManager,
  error,
}: Readonly<Props>) {
  const { t } = useI18n();
  const [showJournalMenu, setShowJournalMenu] = useState(false);
  const [showCreateJournalDialog, setShowCreateJournalDialog] = useState(false);
  const [showRenameJournalDialog, setShowRenameJournalDialog] = useState(false);
  const [newJournalName, setNewJournalName] = useState('');
  const [renameJournalName, setRenameJournalName] = useState('');
  const journalMenuRef = useRef<HTMLDivElement>(null);

  const resolveWeatherLabel = (weatherCode?: number | null, fallback?: string | null) => {
    if (typeof weatherCode !== 'number') return fallback ?? t('diary.weather.default');
    const localized = t(getWeatherLabelKey(weatherCode));
    return localized || fallback || getWeatherLabel(weatherCode);
  };

  const handleCreateJournal = async () => {
    const name = newJournalName.trim();
    if (!name) return;
    const created = await createJournal(name);
    if (created) {
      setShowCreateJournalDialog(false);
      setNewJournalName('');
    }
  };

  const handleRenameJournal = async () => {
    const name = renameJournalName.trim();
    if (!name) return;
    const ok = await renameJournal(name);
    if (ok) setShowRenameJournalDialog(false);
  };

  return (
    <>
      {/* Create journal dialog */}
      <Dialog open={showCreateJournalDialog} onOpenChange={setShowCreateJournalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('diary.createJournalTitle')}</DialogTitle>
            <DialogDescription>{t('diary.createJournalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              value={newJournalName}
              onChange={(e) => setNewJournalName(e.target.value)}
              placeholder={t('diary.journalName')}
              className="border-border bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateJournalDialog(false)}
                className="border-border hover:bg-accent rounded-md border px-3 py-2 text-sm"
              >
                {t('delete.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCreateJournal();
                }}
                className={primaryButtonClass}
              >
                {t('diary.create')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename journal dialog */}
      <Dialog open={showRenameJournalDialog} onOpenChange={setShowRenameJournalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('diary.renameJournalTitle')}</DialogTitle>
            <DialogDescription>{t('diary.renameJournalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              value={renameJournalName}
              onChange={(e) => setRenameJournalName(e.target.value)}
              placeholder={t('diary.journalName')}
              className="border-border bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenameJournalDialog(false)}
                className="border-border hover:bg-accent rounded-md border px-3 py-2 text-sm"
              >
                {t('delete.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleRenameJournal();
                }}
                className={primaryButtonClass}
              >
                {t('main.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar panel */}
      <div
        className={cn(
          'border-border bg-card/80 flex h-full w-full shrink-0 flex-col border-b md:border-r md:border-b-0',
          isMobile ? 'max-w-full' : 'max-w-[256px]',
          'md:w-64 md:min-w-64',
        )}
      >
        <div className="border-border border-b p-3">
          {/* toggle row */}
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-primary text-xl font-semibold tracking-tight">
              {t('sidebar.titleDiary')}
            </h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={effectiveVisible ? t('sidebar.hide') : t('sidebar.show')}
                  data-ui-sound-event={effectiveVisible ? 'close' : 'open'}
                  className="motion-interactive icon-pop-hover text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded p-1.5 transition-colors"
                  onClick={() => {
                    if (isMobile) {
                      setMobileSidebarVisible((prev) => !prev);
                    } else {
                      setSidebarVisible((prev) => !prev);
                    }
                  }}
                >
                  {effectiveVisible ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {effectiveVisible ? t('sidebar.hide') : t('sidebar.show')}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Journal selector */}
            <div ref={journalMenuRef} className="relative w-full min-w-0 sm:flex-1">
              <button
                type="button"
                onClick={() => setShowJournalMenu((prev) => !prev)}
                className="border-border bg-background hover:bg-accent flex h-9 w-full min-w-0 items-center justify-between rounded-md border px-2 text-sm"
              >
                <span className="truncate">
                  {activeJournal?.name ?? journals[0]?.name ?? t('diary.journal')}
                </span>
                <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
              </button>

              {showJournalMenu && (
                <div className="border-border bg-popover absolute z-50 mt-1 max-h-50 w-full overflow-y-auto rounded-md border p-1 shadow-md">
                  {journals.map((journal) => {
                    const isActive = journal.id === activeJournalId;
                    return (
                      <button
                        key={journal.id}
                        type="button"
                        disabled={isActive}
                        onClick={() => {
                          setActiveJournalId(journal.id);
                          setShowJournalMenu(false);
                        }}
                        className={cn(
                          'hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm disabled:cursor-default',
                          isActive ? 'bg-accent text-accent-foreground' : '',
                        )}
                      >
                        {journal.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create journal */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('diary.new')}
                  className="border-border hover:bg-accent rounded-md border p-2"
                  onClick={() => setShowCreateJournalDialog(true)}
                >
                  <Plus size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('diary.new')}</p>
              </TooltipContent>
            </Tooltip>

            {/* Rename journal */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('tree.rename')}
                  disabled={!activeJournalId}
                  className="border-border hover:bg-accent disabled:text-muted-foreground rounded-md border p-2 disabled:opacity-60"
                  onClick={() => {
                    if (!activeJournal) return;
                    setRenameJournalName(activeJournal.name);
                    setShowRenameJournalDialog(true);
                  }}
                >
                  <Pencil size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('tree.rename')}</p>
              </TooltipContent>
            </Tooltip>

            {/* Template manager */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('diary.templates')}
                  disabled={!activeJournalId}
                  className="border-border hover:bg-accent disabled:text-muted-foreground rounded-md border p-2 disabled:opacity-60"
                  onClick={onOpenTemplateManager}
                >
                  <FileText size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('diary.templates')}</p>
              </TooltipContent>
            </Tooltip>

            {/* Mobile close sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('diary.openEditor')}
                  className="border-border hover:bg-accent rounded-md border p-2 md:hidden"
                  onClick={() => setMobileSidebarVisible(false)}
                >
                  <PanelLeftClose size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('diary.openEditor')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* View mode toggle */}
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                viewMode === 'list' ? toggleActiveClass : toggleInactiveClass,
              )}
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
              {t('diary.viewList')}
            </button>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                viewMode === 'calendar' ? toggleActiveClass : toggleInactiveClass,
              )}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays size={14} />
              {t('diary.viewCalendar')}
            </button>
          </div>

          {/* Create entry actions */}
          <div className="space-y-2">
            {!todayEntryExists && (
              <button
                type="button"
                className={cn(primaryButtonClass, 'w-full justify-start')}
                onClick={onCreateToday}
                disabled={creatingEntry}
              >
                <Plus size={14} />
                {t('diary.createToday')}
              </button>
            )}
            <button type="button" className={actionButtonClass} onClick={onOpenCreateDateDialog}>
              <CalendarDays size={14} />
              {t('diary.createAnotherDate')}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error && (
            <p className="text-destructive mb-3 text-sm" role="alert">
              {error}
            </p>
          )}
          <DiaryLeftPanel
            viewMode={viewMode}
            monthCursor={monthCursor}
            setMonthCursor={setMonthCursor}
            selectedDate={selectedDate}
            entriesByDate={entriesByDate}
            handleSelectDate={handleSelectDate}
            loadingList={loadingList}
            loadingEntry={loadingEntry}
            entries={entries}
            groupedEntries={groupedEntries}
            setDeleteTargetDate={setDeleteTargetDate}
            diaryTemperatureUnit={diaryTemperatureUnit}
            dateLocale={dateLocale}
            t={t}
            resolveWeatherLabel={resolveWeatherLabel}
          />
        </div>
      </div>
    </>
  );
}
