'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import type { Editor, JSONContent } from '@tiptap/react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  List,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { EditorToolbar } from '@/components/features/editor/EditorToolbar';
import { PageEditor } from '@/components/features/editor/PageEditor';
import { UnsavedChangesDialog } from '@/components/features/Workspace/UnsavedChangesDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { formatDateLong, parseLocalDate } from '@/lib/dateUtils';
import { useI18n } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/settingsStore';
import { cn } from '@/lib/utils';
import { Group, Panel, Separator } from 'react-resizable-panels';

type DiaryViewMode = 'list' | 'calendar';

type DiaryMeta = {
  id: string;
  journalId: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  hasContent: boolean;
  previewText?: string;
  previewImage?: string | null;
  weatherTempC?: number | null;
  weatherCode?: number | null;
  weatherLabel?: string | null;
  locationName?: string | null;
  locationShort?: string | null;
  locationLat?: number | null;
  locationLon?: number | null;
};

type DiaryJournal = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type DiaryTemplate = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type DiaryEntryResponse = {
  id?: string;
  entryDate: string;
  content: JSONContent | null;
  createdAt: string | null;
  updatedAt: string | null;
  weather?: {
    tempC?: number | null;
    weatherCode?: number | null;
    weatherLabel?: string | null;
    locationName?: string | null;
    locationShort?: string | null;
    locationLat?: number | null;
    locationLon?: number | null;
  };
  exists: boolean;
};

type WeatherSummary = {
  tempC: number;
  weatherCode: number;
  weatherLabel: string;
  locationName: string;
  locationShort: string;
  locationLat?: number | null;
  locationLon?: number | null;
};

type CachedWeatherSummary = WeatherSummary & {
  cachedAt: number;
  date: string;
  locationLat: number;
  locationLon: number;
};

type WeatherSnapshot = WeatherSummary & {
  locationLat: number;
  locationLon: number;
};

type DiaryTranslate = (key: string) => string;

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] };
const DIARY_WEATHER_CACHE_KEY = 'devtree:diaryWeatherSummary';
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function isEmptyDoc(content: JSONContent | null): boolean {
  if (content?.type !== 'doc') return true;
  return !Array.isArray(content.content) || content.content.length === 0;
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather';
}

function getWeatherLabelKey(code: number): string {
  if (code === 0) return 'diary.weather.clear';
  if (code === 1 || code === 2) return 'diary.weather.partlyCloudy';
  if (code === 3) return 'diary.weather.cloudy';
  if (code === 45 || code === 48) return 'diary.weather.fog';
  if (code >= 51 && code <= 67) return 'diary.weather.rain';
  if (code >= 71 && code <= 77) return 'diary.weather.snow';
  if (code >= 80 && code <= 82) return 'diary.weather.rainShowers';
  if (code >= 95) return 'diary.weather.thunderstorm';
  return 'diary.weather.default';
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌍';
}

function celsiusToUnit(tempC: number, unit: 'c' | 'f'): number {
  if (unit === 'f') return (tempC * 9) / 5 + 32;
  return tempC;
}

function formatTemp(tempC: number, unit: 'c' | 'f'): string {
  return `${Math.round(celsiusToUnit(tempC, unit))}°${unit.toUpperCase()}`;
}

function compactLocationFromAddress(address?: {
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  country?: string;
}): string {
  if (!address) return '';
  const street = address.road?.trim() ?? '';
  const city = (address.city ?? address.town ?? address.village ?? '').trim();
  const country = address.country?.trim() ?? '';

  return [country, city, street].filter(Boolean).join(', ');
}

function extractClientPreview(content: JSONContent | null): { previewText: string; previewImage: string | null } {
  if (!content || typeof content !== 'object') {
    return { previewText: '', previewImage: null };
  }

  const textChunks: string[] = [];
  let previewImage: string | null = null;

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const current = node as {
      text?: unknown;
      type?: unknown;
      attrs?: unknown;
      content?: unknown;
    };

    if (typeof current.text === 'string' && current.text.trim()) {
      textChunks.push(current.text.trim());
    }

    if (!previewImage && current.type === 'image' && current.attrs && typeof current.attrs === 'object') {
      const src = (current.attrs as { src?: unknown }).src;
      if (typeof src === 'string' && src.trim()) previewImage = src.trim();
    }

    if (Array.isArray(current.content)) {
      for (const child of current.content) walk(child);
    }
  };

  walk(content);

  return {
    previewText: textChunks.join(' ').split(/\s+/).join(' ').trim().slice(0, 180),
    previewImage,
  };
}

function templateBodyToContent(body: string): JSONContent {
  const lines = body
    .replaceAll(String.raw`\n`, '\n')
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd());

  const blocks: NonNullable<JSONContent['content']> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      blocks.push({ type: 'paragraph' });
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.slice(4).trim() }],
      });
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.slice(3).trim() }],
      });
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.slice(2).trim() }],
      });
      continue;
    }

    blocks.push({ type: 'paragraph', content: [{ type: 'text', text: line }] });
  }

  blocks.push({ type: 'paragraph' });

  return { type: 'doc', content: blocks };
}

function decodeTemplateText(value: string): string {
  return value.replaceAll(String.raw`\n`, '\n');
}

function normalizeTemplatePromptLines(value: string): string[] {
  return value
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildTemplateBodyFromForm(title: string, promptsText: string): string {
  const safeTitle = title.trim();
  const prompts = normalizeTemplatePromptLines(promptsText);
  const parts: string[] = [];

  if (safeTitle) {
    parts.push(`## ${safeTitle}`);
  }

  for (const prompt of prompts) {
    parts.push(`### ${prompt}`);
  }

  return parts.join('\n\n');
}

function parseTemplateBodyToForm(body: string): { title: string; promptsText: string } {
  const decoded = decodeTemplateText(body);
  const lines = decoded
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let title = '';
  const prompts: string[] = [];

  for (const line of lines) {
    if (!title && line.startsWith('## ')) {
      title = line.slice(3).trim();
      continue;
    }

    if (line.startsWith('### ')) {
      prompts.push(line.slice(4).trim());
      continue;
    }

    if (title) {
      prompts.push(line.replace(/^#+\s*/, '').trim());
    } else {
      title = line.replace(/^#+\s*/, '').trim();
    }
  }

  return {
    title,
    promptsText: prompts.join('\n'),
  };
}

async function fetchWeatherSnapshotForDate(
  dateOnly: string,
  locationEnabled: boolean,
): Promise<WeatherSnapshot | null> {
  if (!locationEnabled || !('geolocation' in navigator)) return null;

  const cachedRaw = globalThis.localStorage.getItem(DIARY_WEATHER_CACHE_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedWeatherSummary;
      const isFresh = Date.now() - cached.cachedAt <= WEATHER_CACHE_TTL_MS;
      if (cached.date === dateOnly && isFresh) {
        return {
          tempC: cached.tempC,
          weatherCode: cached.weatherCode,
          weatherLabel: cached.weatherLabel,
          locationName: cached.locationName,
          locationShort: cached.locationShort,
          locationLat: cached.locationLat,
          locationLon: cached.locationLon,
        };
      }
    } catch {
      globalThis.localStorage.removeItem(DIARY_WEATHER_CACHE_KEY);
    }
  }

  return new Promise((resolve) => {
    // eslint-disable-next-line sonarjs/no-intrusive-permissions -- required to capture location snapshot once for user-requested diary metadata
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const [weatherRes, placeRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`,
            ),
          ]);

          if (!weatherRes.ok || !placeRes.ok) {
            resolve(null);
            return;
          }

          const weatherJson = (await weatherRes.json()) as {
            current_weather?: { temperature?: number; weathercode?: number };
          };
          const placeJson = (await placeRes.json()) as {
            display_name?: string;
            address?: {
              house_number?: string;
              road?: string;
              neighbourhood?: string;
              suburb?: string;
              city?: string;
              town?: string;
              village?: string;
              county?: string;
              state?: string;
              country?: string;
            };
          };

          const temp = weatherJson.current_weather?.temperature;
          const weatherCode = weatherJson.current_weather?.weathercode;
          if (typeof temp !== 'number' || typeof weatherCode !== 'number') {
            resolve(null);
            return;
          }

          const locationShort = compactLocationFromAddress(placeJson.address);
          const locationName = (placeJson.display_name ?? locationShort).trim();

          const weatherLabel = getWeatherLabel(weatherCode);

          globalThis.localStorage.setItem(
            DIARY_WEATHER_CACHE_KEY,
            JSON.stringify({
              tempC: temp,
              weatherCode,
              weatherLabel,
              locationName,
              locationShort,
              locationLat: latitude,
              locationLon: longitude,
              cachedAt: Date.now(),
              date: dateOnly,
            } satisfies CachedWeatherSummary),
          );

          resolve({
            tempC: temp,
            weatherCode,
            weatherLabel,
            locationName,
            locationShort,
            locationLat: latitude,
            locationLon: longitude,
          });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

function getHeaderSubtitle(
  selectedDate: string | null,
  locationShort: string | null | undefined,
  t: DiaryTranslate,
): string {
  if (!selectedDate) return t('diary.selectOrCreate');
  if (!locationShort) return t('diary.locationUnavailable');
  return `${t('diary.locationLabel')}: ${locationShort}`;
}

function renderLeftPanelContent({
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
}: {
  viewMode: DiaryViewMode;
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  selectedDate: string | null;
  entriesByDate: Record<string, DiaryMeta>;
  handleSelectDate: (dateOnly: string) => void;
  loadingList: boolean;
  entries: DiaryMeta[];
  groupedEntries: Array<{ month: string; items: DiaryMeta[] }>;
  setDeleteTargetDate: React.Dispatch<React.SetStateAction<string | null>>;
  diaryTemperatureUnit: 'c' | 'f';
  dateLocale: string;
  t: DiaryTranslate;
  resolveWeatherLabel: (weatherCode?: number | null, fallback?: string | null) => string;
}) {
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
    return <div className="bg-muted h-28 animate-pulse rounded-xl" />;
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

// eslint-disable-next-line sonarjs/cognitive-complexity -- DiaryPage intentionally orchestrates page-level state and handlers
export default function DiaryPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { diaryLocationEnabled, diaryTemperatureUnit } = useSettingsStore();
  const dateLocale = locale === 'uk' ? 'uk-UA' : 'en-US';

  const today = useMemo(() => toDateOnly(new Date()), []);

  const [viewMode, setViewMode] = useState<DiaryViewMode>('list');
  const [journals, setJournals] = useState<DiaryJournal[]>([]);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryMeta[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date());

  const [content, setContent] = useState<JSONContent>(EMPTY_DOC);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTargetDate, setDeleteTargetDate] = useState<string | null>(null);
  const [newJournalName, setNewJournalName] = useState('');
  const [renameJournalName, setRenameJournalName] = useState('');
  const [showCreateJournalDialog, setShowCreateJournalDialog] = useState(false);
  const [showRenameJournalDialog, setShowRenameJournalDialog] = useState(false);
  const [showJournalMenu, setShowJournalMenu] = useState(false);
  const [showTemplateManagerDialog, setShowTemplateManagerDialog] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templates, setTemplates] = useState<DiaryTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateTitleInput, setTemplateTitleInput] = useState('');
  const [templatePromptsInput, setTemplatePromptsInput] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [lockedTemplateBlocks, setLockedTemplateBlocks] = useState<NonNullable<JSONContent['content']> | null>(null);
  const [lockedTemplateByDate, setLockedTemplateByDate] = useState<
    Record<string, NonNullable<JSONContent['content']>>
  >({});
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const originalContentRef = useRef<string>(JSON.stringify(EMPTY_DOC));
  const journalMenuRef = useRef<HTMLDivElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);

  const [createDateValue, setCreateDateValue] = useState(today);
  const toggleActiveClass = 'bg-accent text-accent-foreground';
  const toggleInactiveClass = 'text-muted-foreground';
  const createActionButtonClass =
    'border-border bg-card hover:bg-accent/70 hover:border-primary/35 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-xs transition-colors';
  const createPrimaryButtonClass =
    'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60';

  const diaryQuery = useMemo(
    () => (activeJournalId ? `?journalId=${encodeURIComponent(activeJournalId)}` : ''),
    [activeJournalId],
  );

  const activeJournal = useMemo(
    () => journals.find((journal) => journal.id === activeJournalId) ?? null,
    [activeJournalId, journals],
  );

  const entriesByDate = useMemo(() => {
    const map: Record<string, DiaryMeta> = {};
    for (const entry of entries) map[entry.entryDate] = entry;
    return map;
  }, [entries]);

  const selectedEntryExists = selectedDate ? Boolean(entriesByDate[selectedDate]) : false;
  const todayEntryExists = Boolean(entriesByDate[today]);

  const selectedWeatherSummary = useMemo(() => {
    if (!selectedDate) return null;
    const entry = entriesByDate[selectedDate];
    if (!entry) return null;
    if (typeof entry.weatherTempC !== 'number' || typeof entry.weatherCode !== 'number') return null;
    return {
      tempC: entry.weatherTempC,
      weatherCode: entry.weatherCode,
      weatherLabel: entry.weatherLabel ?? getWeatherLabel(entry.weatherCode),
      locationName: entry.locationName ?? '',
      locationShort: entry.locationShort ?? entry.locationName ?? '',
      locationLat: entry.locationLat,
      locationLon: entry.locationLon,
    };
  }, [entriesByDate, selectedDate]);

  const groupedEntries = useMemo(() => {
    const groups: Array<{ month: string; items: DiaryMeta[] }> = [];
    for (const entry of entries) {
      const month = monthTitle(parseLocalDate(entry.entryDate), dateLocale);
      const lastGroup = groups.at(-1);
      if (lastGroup?.month === month) {
        lastGroup.items.push(entry);
      } else {
        groups.push({ month, items: [entry] });
      }
    }
    return groups;
  }, [dateLocale, entries]);

  const resolveWeatherLabel = useCallback(
    (weatherCode?: number | null, fallback?: string | null) => {
      if (typeof weatherCode !== 'number') return fallback ?? t('diary.weather.default');
      const localized = t(getWeatherLabelKey(weatherCode));
      return localized || fallback || getWeatherLabel(weatherCode);
    },
    [t],
  );

  const fetchJournals = useCallback(async () => {
    setErrorText(null);
    try {
      const res = await fetch('/api/diary/journals');
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryJournal[]
        | null;

      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load journals');
      }

      const nextJournals = Array.isArray(body) ? body : [];
      setJournals(nextJournals);
      setActiveJournalId((prev) => prev ?? nextJournals[0]?.id ?? null);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to load journals');
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!activeJournalId) return;
    setLoadingList(true);
    setErrorText(null);
    try {
      const res = await fetch(`/api/diary${diaryQuery}`);
      const body = (await res.json().catch(() => null)) as { error?: string } | DiaryMeta[] | null;
      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load diary entries');
      }
      setEntries(Array.isArray(body) ? body : []);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to load diary entries');
    } finally {
      setLoadingList(false);
    }
  }, [activeJournalId, diaryQuery]);

  const fetchTemplates = useCallback(async () => {
    if (!activeJournalId) {
      setTemplates([]);
      return;
    }

    setLoadingTemplates(true);
    try {
      const res = await fetch(`/api/diary/journals/${activeJournalId}/templates`);
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryTemplate[]
        | null;

      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load templates');
      }

      setTemplates(Array.isArray(body) ? body : []);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [activeJournalId]);

  const loadEntry = useCallback(async (dateOnly: string) => {
    setLoadingEntry(true);
    setErrorText(null);

    try {
      const hasEntry = Boolean(entriesByDate[dateOnly]);
      if (!hasEntry) {
        setSelectedDate(dateOnly);
        setContent(EMPTY_DOC);
        setLockedTemplateBlocks(lockedTemplateByDate[dateOnly] ?? null);
        originalContentRef.current = JSON.stringify(EMPTY_DOC);
        setIsDirty(false);
        setSaveState('idle');
        return;
      }

      const res = await fetch(`/api/diary/${dateOnly}${diaryQuery}`);
      const body = (await res.json().catch(() => null)) as DiaryEntryResponse | { error?: string } | null;
      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load diary entry');
      }

      const entry = body as DiaryEntryResponse;
      const nextContent = entry.content ?? EMPTY_DOC;

      setSelectedDate(dateOnly);
      setContent(nextContent);
      setLockedTemplateBlocks(lockedTemplateByDate[dateOnly] ?? null);
      originalContentRef.current = JSON.stringify(nextContent);
      setIsDirty(false);
      setSaveState('idle');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to load diary entry');
      setSaveState('error');
    } finally {
      setLoadingEntry(false);
    }
  }, [diaryQuery, entriesByDate, lockedTemplateByDate]);

  const saveCurrentEntry = useCallback(async () => {
    if (!selectedDate) return false;

    setSaveState('saving');
    setErrorText(null);

    try {
      const res = await fetch(`/api/diary/${selectedDate}${diaryQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = (await res.json().catch(() => null)) as
        | (Omit<DiaryEntryResponse, 'exists'> & { error?: never })
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to save diary entry');
      }

      const saved = body as Omit<DiaryEntryResponse, 'exists'>;
      const preview = extractClientPreview(content);
      const savedMeta: DiaryMeta = {
        id: saved.id ?? selectedDate,
        journalId: activeJournalId ?? '',
        entryDate: saved.entryDate,
        createdAt: saved.createdAt ?? new Date().toISOString(),
        updatedAt: saved.updatedAt ?? new Date().toISOString(),
        hasContent: !isEmptyDoc(content),
        previewText: preview.previewText,
        previewImage: preview.previewImage,
        weatherTempC: saved.weather?.tempC ?? null,
        weatherCode: saved.weather?.weatherCode ?? null,
        weatherLabel: saved.weather?.weatherLabel ?? null,
        locationName: saved.weather?.locationName ?? null,
        locationShort: saved.weather?.locationShort ?? null,
        locationLat: saved.weather?.locationLat ?? null,
        locationLon: saved.weather?.locationLon ?? null,
      };

      setEntries((prev) => {
        const withoutCurrent = prev.filter((entry) => entry.entryDate !== savedMeta.entryDate);
        const next = [...withoutCurrent, savedMeta];
        return next.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
      });

      originalContentRef.current = JSON.stringify(content);
      setIsDirty(false);
      setSaveState('saved');
      return true;
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to save diary entry');
      setSaveState('error');
      return false;
    }
  }, [activeJournalId, content, diaryQuery, selectedDate]);

  const requestWithUnsavedGuard = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setShowUnsavedDialog(true);
    },
    [isDirty],
  );

  const createEntryNow = useCallback(
    async (dateOnly: string) => {
      if (entriesByDate[dateOnly]) {
        await loadEntry(dateOnly);
        return;
      }

      setCreatingEntry(true);
      setLoadingEntry(true);
      setErrorText(null);

      try {
        const shouldAttachWeather = dateOnly === today;
        const snapshot = shouldAttachWeather
          ? await fetchWeatherSnapshotForDate(dateOnly, diaryLocationEnabled)
          : null;
        const weatherPayload = snapshot
          ? {
              tempC: snapshot.tempC,
              weatherCode: snapshot.weatherCode,
              weatherLabel: snapshot.weatherLabel,
              locationName: snapshot.locationName,
              locationShort: snapshot.locationShort,
              locationLat: snapshot.locationLat,
              locationLon: snapshot.locationLon,
            }
          : undefined;

        const res = await fetch(`/api/diary/${dateOnly}${diaryQuery}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: EMPTY_DOC, weather: weatherPayload }),
        });

        const body = (await res.json().catch(() => null)) as
          | (Omit<DiaryEntryResponse, 'exists'> & { error?: never })
          | { error?: string }
          | null;

        if (!res.ok) {
          throw new Error((body as { error?: string } | null)?.error ?? 'Failed to create diary entry');
        }

        const created = body as Omit<DiaryEntryResponse, 'exists'>;
        const createdContent = created.content ?? EMPTY_DOC;
        const preview = extractClientPreview(createdContent);
        const createdMeta: DiaryMeta = {
          id: created.id ?? dateOnly,
          journalId: activeJournalId ?? '',
          entryDate: created.entryDate,
          createdAt: created.createdAt ?? new Date().toISOString(),
          updatedAt: created.updatedAt ?? new Date().toISOString(),
          hasContent: false,
          previewText: preview.previewText,
          previewImage: preview.previewImage,
          weatherTempC: created.weather?.tempC ?? null,
          weatherCode: created.weather?.weatherCode ?? null,
          weatherLabel: created.weather?.weatherLabel ?? null,
          locationName: created.weather?.locationName ?? null,
          locationShort: created.weather?.locationShort ?? null,
          locationLat: created.weather?.locationLat ?? null,
          locationLon: created.weather?.locationLon ?? null,
        };

        setEntries((prev) => {
          const withoutCurrent = prev.filter((entry) => entry.entryDate !== createdMeta.entryDate);
          const next = [...withoutCurrent, createdMeta];
          return next.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        });

        setSelectedDate(created.entryDate);
        setContent(createdContent);
        setLockedTemplateBlocks(null);
        originalContentRef.current = JSON.stringify(createdContent);
        setIsDirty(false);
        setSaveState('saved');
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Failed to create diary entry');
        setSaveState('error');
      } finally {
        setCreatingEntry(false);
        setLoadingEntry(false);
      }
    },
    [activeJournalId, diaryLocationEnabled, diaryQuery, entriesByDate, loadEntry, today],
  );

  const createEntryForDate = useCallback(
    (dateOnly: string) => {
      requestWithUnsavedGuard(() => {
        void createEntryNow(dateOnly);
      });
    },
    [createEntryNow, requestWithUnsavedGuard],
  );

  const handleSelectDate = useCallback(
    (dateOnly: string) => {
      if (dateOnly === selectedDate) return;
      requestWithUnsavedGuard(() => {
        void loadEntry(dateOnly);
      });
    },
    [loadEntry, requestWithUnsavedGuard, selectedDate],
  );

  const handleCreateTodayFromSidebar = () => {
    if (todayEntryExists) return;
    createEntryForDate(today);
  };

  const handleOpenCreateDateDialog = () => {
    setCreateDateValue(selectedDate ?? today);
    setShowCreateDialog(true);
  };

  const handleCreateForPickedDate = () => {
    if (!createDateValue) return;
    createEntryForDate(createDateValue);
    setShowCreateDialog(false);
  };

  const handleCreateJournal = async () => {
    const name = newJournalName.trim();
    if (!name) return;

    setErrorText(null);
    try {
      const res = await fetch('/api/diary/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryJournal
        | null;

      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to create journal');
      }

      const created = body as DiaryJournal;
      setJournals((prev) => [...prev, created]);
      setActiveJournalId(created.id);
      setShowCreateJournalDialog(false);
      setNewJournalName('');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to create journal');
    }
  };

  const handleRenameJournal = async () => {
    if (!activeJournalId) return;
    const name = renameJournalName.trim();
    if (!name) return;

    setErrorText(null);
    try {
      const res = await fetch(`/api/diary/journals/${activeJournalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryJournal
        | null;

      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to rename journal');
      }

      const updated = body as DiaryJournal;
      setJournals((prev) =>
        prev.map((journal) => (journal.id === updated.id ? { ...journal, name: updated.name } : journal)),
      );
      setShowRenameJournalDialog(false);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to rename journal');
    }
  };

  const resetTemplateEditor = () => {
    setEditingTemplateId(null);
    setTemplateNameInput('');
    setTemplateTitleInput('');
    setTemplatePromptsInput('');
  };

  const handleCreateTemplate = async () => {
    if (!activeJournalId) return;
    const name = templateNameInput.trim();
    const body = buildTemplateBodyFromForm(templateTitleInput, templatePromptsInput).trim();
    if (!name || !body) return;

    setErrorText(null);
    try {
      const res = await fetch(`/api/diary/journals/${activeJournalId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryTemplate
        | null;

      if (!res.ok) {
        throw new Error((payload as { error?: string } | null)?.error ?? 'Failed to create template');
      }

      setTemplates((prev) => [...prev, payload as DiaryTemplate]);
      resetTemplateEditor();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!activeJournalId || !editingTemplateId) return;
    const name = templateNameInput.trim();
    const body = buildTemplateBodyFromForm(templateTitleInput, templatePromptsInput).trim();
    if (!name || !body) return;

    setErrorText(null);
    try {
      const res = await fetch(
        `/api/diary/journals/${activeJournalId}/templates/${editingTemplateId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, body }),
        },
      );

      const payload = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryTemplate
        | null;

      if (!res.ok) {
        throw new Error((payload as { error?: string } | null)?.error ?? 'Failed to update template');
      }

      const updated = payload as DiaryTemplate;
      setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      resetTemplateEditor();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!activeJournalId) return;

    setErrorText(null);
    try {
      const res = await fetch(`/api/diary/journals/${activeJournalId}/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Failed to delete template');
      }

      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
      if (editingTemplateId === templateId) resetTemplateEditor();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to delete template');
    }
  };

  const applyTemplate = (template: DiaryTemplate) => {
    requestWithUnsavedGuard(() => {
      const nextContent = templateBodyToContent(template.body);
      const blocks = (nextContent.content ?? []).slice();
      const nextLockedBlocks = blocks.filter((block, idx, arr) => {
        if (idx !== arr.length - 1) return true;
        return block.type !== 'paragraph' || Boolean(block.content?.length);
      });
      setContent(nextContent);
      setLockedTemplateBlocks(nextLockedBlocks);
      if (selectedDate) {
        setLockedTemplateByDate((prev) => ({ ...prev, [selectedDate]: nextLockedBlocks }));
      }
      setIsDirty(true);
      setSaveState('idle');
      setShowTemplateMenu(false);
    });
  };

  const handleSaveAndLeaveFromDialog = async () => {
    const ok = await saveCurrentEntry();
    if (!ok) return;

    setShowUnsavedDialog(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  };

  const handleDiscardAndLeaveFromDialog = () => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  };

  const handleCancelLeaveFromDialog = () => {
    setShowUnsavedDialog(false);
    pendingActionRef.current = null;
  };

  const handleContentChange = (nextContent: JSONContent) => {
    let normalized = nextContent;

    if (lockedTemplateBlocks && Array.isArray(nextContent.content)) {
      const lockLen = lockedTemplateBlocks.length;
      const currentPrefix = nextContent.content.slice(0, lockLen);
      if (JSON.stringify(currentPrefix) !== JSON.stringify(lockedTemplateBlocks)) {
        normalized = {
          ...nextContent,
          content: [...lockedTemplateBlocks, ...nextContent.content.slice(lockLen)],
        };
      }
    }

    setContent(normalized);
    const currentJson = JSON.stringify(normalized);
    setIsDirty(currentJson !== originalContentRef.current);
    setSaveState('idle');
  };

  const deleteEntryByDate = useCallback(async (dateOnly: string) => {
    if (!dateOnly) return;

    setErrorText(null);
    try {
      await fetch(`/api/diary/${dateOnly}${diaryQuery}`, { method: 'DELETE' });
      setEntries((prev) => prev.filter((entry) => entry.entryDate !== dateOnly));

      if (selectedDate === dateOnly) {
        setSelectedDate(null);
        setContent(EMPTY_DOC);
        setLockedTemplateBlocks(null);
        setLockedTemplateByDate((prev) => {
          const next = { ...prev };
          delete next[dateOnly];
          return next;
        });
        originalContentRef.current = JSON.stringify(EMPTY_DOC);
        setIsDirty(false);
        setSaveState('idle');
      }

      setDeleteTargetDate(null);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to delete diary entry');
    }
  }, [diaryQuery, selectedDate]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated') {
      void fetchJournals();
    }
  }, [fetchJournals, router, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !activeJournalId) return;
    setSelectedDate(null);
    setContent(EMPTY_DOC);
    setLockedTemplateBlocks(null);
    setLockedTemplateByDate({});
    originalContentRef.current = JSON.stringify(EMPTY_DOC);
    setIsDirty(false);
    setSaveState('idle');
    void fetchEntries();
    void fetchTemplates();
    setShowTemplateMenu(false);
    resetTemplateEditor();
  }, [activeJournalId, fetchEntries, fetchTemplates, status]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };

    globalThis.addEventListener('beforeunload', onBeforeUnload);
    return () => globalThis.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!activeJournalId || selectedDate || !todayEntryExists) return;
    void loadEntry(today);
  }, [activeJournalId, loadEntry, selectedDate, today, todayEntryExists]);

  useEffect(() => {
    if (!showJournalMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!journalMenuRef.current) return;
      if (journalMenuRef.current.contains(event.target as Node)) return;
      setShowJournalMenu(false);
    };
    globalThis.addEventListener('mousedown', onPointerDown);
    return () => globalThis.removeEventListener('mousedown', onPointerDown);
  }, [showJournalMenu]);

  useEffect(() => {
    if (!showTemplateMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!templateMenuRef.current) return;
      if (templateMenuRef.current.contains(event.target as Node)) return;
      setShowTemplateMenu(false);
    };
    globalThis.addEventListener('mousedown', onPointerDown);
    return () => globalThis.removeEventListener('mousedown', onPointerDown);
  }, [showTemplateMenu]);

  useEffect(() => {
    const update = () => {
      setIsMobile(globalThis.innerWidth < 768);
    };
    update();
    globalThis.addEventListener('resize', update);
    return () => globalThis.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (selectedDate && selectedEntryExists) {
      setMobileSidebarVisible(false);
    }
  }, [isMobile, selectedDate, selectedEntryExists]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-border border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  const leftPanelContent = renderLeftPanelContent({
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
  });

  const headerSubtitle = getHeaderSubtitle(selectedDate, selectedWeatherSummary?.locationShort, t);

  const sidebarContent = (
    <aside className="border-border bg-card/80 flex h-full w-full shrink-0 flex-col border-b md:border-r md:border-b-0">
      <div className="border-border border-b p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div ref={journalMenuRef} className="relative min-w-0 w-full sm:flex-1">
            <button
              type="button"
              onClick={() => setShowJournalMenu((prev) => !prev)}
              className="border-border bg-background hover:bg-accent flex h-9 w-full min-w-0 items-center justify-between rounded-md border px-2 text-sm"
            >
              <span className="truncate">{activeJournal?.name ?? journals[0]?.name ?? t('diary.journal')}</span>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('diary.toggleSidebar')}
                className="border-border hover:bg-accent rounded-md border p-2"
                onClick={() => {
                  if (isMobile) {
                    setMobileSidebarVisible(false);
                  } else {
                    setSidebarVisible((prev) => !prev);
                  }
                }}
              >
                {sidebarVisible ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('diary.toggleSidebar')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('tree.rename')}
                disabled={!activeJournalId}
                className="border-border hover:bg-accent disabled:text-muted-foreground disabled:opacity-60 rounded-md border p-2"
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('diary.templates')}
                disabled={!activeJournalId}
                className="border-border hover:bg-accent disabled:text-muted-foreground disabled:opacity-60 rounded-md border p-2"
                onClick={() => setShowTemplateManagerDialog(true)}
              >
                <FileText size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('diary.templates')}</p>
            </TooltipContent>
          </Tooltip>
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

        <div className="space-y-2">
          {!todayEntryExists && (
            <button
              type="button"
              className={cn(createPrimaryButtonClass, 'w-full justify-start')}
              onClick={handleCreateTodayFromSidebar}
              disabled={creatingEntry}
            >
              <Plus size={14} />
              {t('diary.createToday')}
            </button>
          )}
          <button type="button" className={createActionButtonClass} onClick={handleOpenCreateDateDialog}>
            <CalendarDays size={14} />
            {t('diary.createAnotherDate')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {errorText && (
          <p className="text-destructive mb-3 text-sm" role="alert">
            {errorText}
          </p>
        )}
        {leftPanelContent}
      </div>
    </aside>
  );

  const mainContent = (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="border-border bg-card flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            {selectedDate && selectedWeatherSummary ? (
              <span className="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                {getWeatherIcon(selectedWeatherSummary.weatherCode)} {formatTemp(selectedWeatherSummary.tempC, diaryTemperatureUnit)}
              </span>
            ) : null}
            <span>{selectedDate ? formatDateLong(parseLocalDate(selectedDate), dateLocale) : t('nav.diary')}</span>
          </h1>
          <p className="text-muted-foreground text-sm">{headerSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* sidebar toggle relocated into the sidebar for clearer UX */}

          <div ref={templateMenuRef} className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('diary.applyTemplate')}
                  disabled={!selectedDate || !selectedEntryExists || templates.length === 0}
                  onClick={() => setShowTemplateMenu((prev) => !prev)}
                  className="border-border bg-background hover:bg-accent disabled:text-muted-foreground inline-flex items-center gap-1 rounded-md border p-2 text-xs disabled:opacity-60"
                >
                  <FileText size={14} />
                  <ChevronDown size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('diary.applyTemplate')}</p>
              </TooltipContent>
            </Tooltip>

            {showTemplateMenu && (
              <div className="border-border bg-popover absolute right-0 z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-md border p-1 shadow-md">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
                    onClick={() => applyTemplate(template)}
                  >
                    <p className="truncate font-medium">{template.name}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{decodeTemplateText(template.body)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('diary.templates')}
                disabled={!activeJournalId}
                onClick={() => setShowTemplateManagerDialog(true)}
                className="border-border bg-background hover:bg-accent disabled:text-muted-foreground inline-flex items-center rounded-md border p-2 text-xs disabled:opacity-60"
              >
                <Edit3 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('diary.templates')}</p>
            </TooltipContent>
          </Tooltip>

          <span
            className={cn(
              'hidden text-xs sm:inline',
              saveState === 'saving' && 'text-muted-foreground',
              saveState === 'saved' && 'text-green-600 dark:text-green-400',
              saveState === 'error' && 'text-destructive',
            )}
          >
            {saveState === 'saving' && t('diary.saving')}
            {saveState === 'saved' && t('main.saved')}
            {saveState === 'error' && t('diary.saveFailed')}
            {saveState === 'idle' && (isDirty ? t('diary.unsavedChanges') : t('diary.ready'))}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('main.save')}
                disabled={!isDirty || !selectedDate || loadingEntry || creatingEntry}
                onClick={() => {
                  void saveCurrentEntry();
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm',
                  !isDirty || !selectedDate || loadingEntry || creatingEntry
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
                )}
              >
                <Save size={14} />
                {t('main.save')}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t('main.save')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {!selectedDate || !selectedEntryExists ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="border-border bg-card w-full max-w-lg rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('diary.journal')}</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => createEntryForDate(today)}
                className={cn(createPrimaryButtonClass, 'w-full')}
                disabled={todayEntryExists || creatingEntry}
              >
                <Plus size={14} />
                {t('diary.createToday')}
              </button>
              <button
                type="button"
                className={createActionButtonClass}
                onClick={handleOpenCreateDateDialog}
                disabled={creatingEntry}
              >
                <CalendarDays size={14} />
                {t('diary.chooseDateCreate')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {editor && <EditorToolbar editor={editor} blockId={`diary-${selectedDate}`} />}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingEntry ? (
              <div className="p-6">
                <div className="bg-muted h-40 animate-pulse rounded-xl" />
              </div>
            ) : (
              <PageEditor
                content={content}
                editable
                mode="diary"
                onChange={handleContentChange}
                pageId={`diary-${selectedDate}`}
                onEditorReady={setEditor}
              />
            )}
          </div>
        </>
      )}
    </section>
  );

  return (
    <>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSaveAndLeave={handleSaveAndLeaveFromDialog}
        onLeaveWithout={handleDiscardAndLeaveFromDialog}
        onCancel={handleCancelLeaveFromDialog}
      />

      <AlertDialog
        open={deleteTargetDate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetDate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('diary.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('diary.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTargetDate) {
                  void deleteEntryByDate(deleteTargetDate);
                }
              }}
            >
              {t('delete.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={18} />
              {t('diary.createEntryTitle')}
            </DialogTitle>
            <DialogDescription>{t('diary.createEntryDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-border rounded-xl border p-3">
              <DiaryCalendar
                monthDate={monthCursor}
                selectedDate={createDateValue}
                entriesByDate={entriesByDate}
                onPrevMonth={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                onNextMonth={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                onSetMonthDate={(nextDate) => setMonthCursor(nextDate)}
                onSelectDate={(dateOnly) => setCreateDateValue(dateOnly)}
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
                onClick={() => setShowCreateDialog(false)}
                className="border-border hover:bg-accent rounded-xl border px-3 py-2 text-sm"
              >
                {t('delete.cancel')}
              </button>
              <button
                type="button"
                className={createPrimaryButtonClass}
                onClick={handleCreateForPickedDate}
                disabled={!createDateValue || creatingEntry}
              >
                <Plus size={14} />
                {t('diary.createEntry')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateJournalDialog} onOpenChange={setShowCreateJournalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('diary.createJournalTitle')}</DialogTitle>
            <DialogDescription>{t('diary.createJournalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              value={newJournalName}
              onChange={(event) => setNewJournalName(event.target.value)}
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
                className={createPrimaryButtonClass}
              >
                {t('diary.create')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameJournalDialog} onOpenChange={setShowRenameJournalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('diary.renameJournalTitle')}</DialogTitle>
            <DialogDescription>{t('diary.renameJournalDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              value={renameJournalName}
              onChange={(event) => setRenameJournalName(event.target.value)}
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
                className={createPrimaryButtonClass}
              >
                {t('main.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showTemplateManagerDialog}
        onOpenChange={(open) => {
          setShowTemplateManagerDialog(open);
          if (!open) resetTemplateEditor();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('diary.templateManagerTitle')}</DialogTitle>
            <DialogDescription>{t('diary.templateManagerDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-border max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
              {loadingTemplates && (
                <p className="text-muted-foreground px-2 py-1 text-sm">{t('diary.loadingTemplates')}</p>
              )}

              {!loadingTemplates && templates.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-sm">{t('diary.noTemplates')}</p>
              )}

              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border-border bg-card/70 flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{template.name}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {decodeTemplateText(template.body)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="border-border hover:bg-accent rounded-md border px-2 py-1 text-xs"
                      onClick={() => {
                        const parsed = parseTemplateBodyToForm(template.body);
                        setEditingTemplateId(template.id);
                        setTemplateNameInput(template.name);
                        setTemplateTitleInput(parsed.title);
                        setTemplatePromptsInput(parsed.promptsText);
                      }}
                    >
                      {t('diary.editTemplate')}
                    </button>
                    <button
                      type="button"
                      className="border-border hover:bg-accent rounded-md border px-2 py-1 text-xs"
                      onClick={() => {
                        void handleDeleteTemplate(template.id);
                      }}
                    >
                      {t('delete.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <input
                value={templateNameInput}
                onChange={(event) => setTemplateNameInput(event.target.value)}
                placeholder={t('diary.templateNamePlaceholder')}
                className="border-border bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
              />
              <input
                value={templateTitleInput}
                onChange={(event) => setTemplateTitleInput(event.target.value)}
                placeholder={t('diary.templateTitlePlaceholder')}
                className="border-border bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
              />
              <textarea
                value={templatePromptsInput}
                onChange={(event) => setTemplatePromptsInput(event.target.value)}
                placeholder={t('diary.templatePromptsPlaceholder')}
                rows={6}
                className="border-border bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <p className="text-muted-foreground text-xs">{t('diary.templateHint')}</p>
            </div>

            <div className="flex justify-end gap-2">
              {editingTemplateId && (
                <button
                  type="button"
                  className="border-border hover:bg-accent rounded-md border px-3 py-2 text-sm"
                  onClick={resetTemplateEditor}
                >
                  {t('diary.cancelEditTemplate')}
                </button>
              )}
              <button
                type="button"
                className={createPrimaryButtonClass}
                onClick={() => {
                  if (editingTemplateId) {
                    void handleUpdateTemplate();
                    return;
                  }
                  void handleCreateTemplate();
                }}
                disabled={
                  !templateNameInput.trim() ||
                  !buildTemplateBodyFromForm(templateTitleInput, templatePromptsInput).trim()
                }
              >
                {editingTemplateId ? t('diary.updateTemplate') : t('diary.createTemplate')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-background h-full overflow-hidden">
        <Group orientation="horizontal" className="hidden h-full md:flex">
          <Panel defaultSize="28%" minSize="18%" maxSize="42%">
            {sidebarContent}
          </Panel>
          <Separator className="z-10 w-1 bg-border/20 hover:bg-border/40 cursor-col-resize transition-colors" />
          <Panel minSize="58%" defaultSize="72%">
            {mainContent}
          </Panel>
        </Group>

        <div className="flex h-full flex-col md:hidden">
          {mobileSidebarVisible ? sidebarContent : mainContent}
        </div>
      </div>
    </>
  );
}

function DiaryCalendar({
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
}: Readonly<{
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
}>) {
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
                      {new Date(year, monthIndex, 1).toLocaleDateString(dateLocale, { month: 'short' })}
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

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
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
                'relative h-9 rounded-md text-sm hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent',
                selected && 'bg-accent text-accent-foreground font-semibold',
                !selected && isToday && 'ring-primary ring-1',
              )}
              title={formatDateLong(parseLocalDate(dateOnly))}
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

function DiaryTimelineList({
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
}: Readonly<{
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
}>) {
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
                        'border-border bg-card/70 hover:bg-accent/60 hover:border-primary/30 w-full rounded-xl border px-3 py-2.5 pr-10 text-left shadow-xs transition-colors disabled:cursor-default disabled:hover:bg-card/70 disabled:hover:border-border',
                        selected
                          ? 'ring-primary/30 bg-accent border-primary/35 ring-2'
                          : '',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {formatDateLong(parseLocalDate(entry.entryDate), dateLocale)}
                          </p>
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                            {entry.previewText?.trim() || (entry.hasContent ? hasContentLabel : noTextLabel)}
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
                                {formatTemp(entry.weatherTempC, 'c')} · {formatTemp(entry.weatherTempC, 'f')}
                              </p>
                              <p className="text-xs opacity-90">{weatherCodeLabel}: {entry.weatherCode}</p>
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
