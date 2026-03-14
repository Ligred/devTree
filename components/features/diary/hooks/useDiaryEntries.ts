'use client';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { JSONContent } from '@tiptap/react';

import { parseLocalDate } from '@/lib/dateUtils';
import { useSettingsStore } from '@/lib/settingsStore';

import {
  EMPTY_DOC,
  extractClientPreview,
  fetchWeatherSnapshotForDate,
  isEmptyDoc,
  monthTitle,
} from '../diaryUtils';
import type { DiaryEntryResponse, DiaryMeta } from '../types';

export function useDiaryEntries(
  activeJournalId: string | null,
  diaryQuery: string,
  today: string,
  dateLocale: string,
) {
  const { diaryLocationEnabled } = useSettingsStore();

  const [entries, setEntries] = useState<DiaryMeta[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [content, setContent] = useState<JSONContent>(EMPTY_DOC);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalContentRef = useRef<string>(JSON.stringify(EMPTY_DOC));

  const entriesByDate = useMemo(() => {
    const map: Record<string, DiaryMeta> = {};
    for (const entry of entries) map[entry.entryDate] = entry;
    return map;
  }, [entries]);

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

  const resetToEmpty = useCallback((date: string | null = null) => {
    setSelectedDate(date);
    setContent(EMPTY_DOC);
    originalContentRef.current = JSON.stringify(EMPTY_DOC);
    setIsDirty(false);
    setSaveState('idle');
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!activeJournalId) return;
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch(`/api/diary${diaryQuery}`);
      const body = (await res.json().catch(() => null)) as { error?: string } | DiaryMeta[] | null;
      if (!res.ok)
        throw new Error(
          (body as { error?: string } | null)?.error ?? 'Failed to load diary entries',
        );
      setEntries(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diary entries');
    } finally {
      setLoadingList(false);
    }
  }, [activeJournalId, diaryQuery]);

  const loadEntry = useCallback(
    async (dateOnly: string) => {
      setLoadingEntry(true);
      setError(null);
      try {
        const hasEntry = Boolean(entriesByDate[dateOnly]);
        if (!hasEntry) {
          setSelectedDate(dateOnly);
          setContent(EMPTY_DOC);
          originalContentRef.current = JSON.stringify(EMPTY_DOC);
          setIsDirty(false);
          setSaveState('idle');
          return;
        }
        const res = await fetch(`/api/diary/${dateOnly}${diaryQuery}`);
        const body = (await res.json().catch(() => null)) as
          | DiaryEntryResponse
          | { error?: string }
          | null;
        if (!res.ok)
          throw new Error(
            (body as { error?: string } | null)?.error ?? 'Failed to load diary entry',
          );
        const entry = body as DiaryEntryResponse;
        const nextContent = entry.content ?? EMPTY_DOC;
        setSelectedDate(dateOnly);
        setContent(nextContent);
        originalContentRef.current = JSON.stringify(nextContent);
        setIsDirty(false);
        setSaveState('idle');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load diary entry');
        setSaveState('error');
      } finally {
        setLoadingEntry(false);
      }
    },
    [diaryQuery, entriesByDate],
  );

  const saveCurrentEntry = useCallback(
    async (currentSelectedDate: string | null, currentContent: JSONContent): Promise<boolean> => {
      if (!currentSelectedDate) return false;
      setSaveState('saving');
      setError(null);
      try {
        const res = await fetch(`/api/diary/${currentSelectedDate}${diaryQuery}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: currentContent }),
        });
        const body = (await res.json().catch(() => null)) as
          | (Omit<DiaryEntryResponse, 'exists'> & { error?: never })
          | { error?: string }
          | null;
        if (!res.ok)
          throw new Error(
            (body as { error?: string } | null)?.error ?? 'Failed to save diary entry',
          );
        const saved = body as Omit<DiaryEntryResponse, 'exists'>;
        const preview = extractClientPreview(currentContent);
        const savedMeta: DiaryMeta = {
          id: saved.id ?? currentSelectedDate,
          journalId: activeJournalId ?? '',
          entryDate: saved.entryDate,
          createdAt: saved.createdAt ?? new Date().toISOString(),
          updatedAt: saved.updatedAt ?? new Date().toISOString(),
          hasContent: !isEmptyDoc(currentContent),
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
          const without = prev.filter((e) => e.entryDate !== savedMeta.entryDate);
          return [...without, savedMeta].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        });
        originalContentRef.current = JSON.stringify(currentContent);
        setIsDirty(false);
        setSaveState('saved');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save diary entry');
        setSaveState('error');
        return false;
      }
    },
    [activeJournalId, diaryQuery],
  );

  const createEntryNow = useCallback(
    async (dateOnly: string) => {
      const hasEntry = Boolean(entriesByDate[dateOnly]);
      if (hasEntry) {
        await loadEntry(dateOnly);
        return;
      }
      setCreatingEntry(true);
      setLoadingEntry(true);
      setError(null);
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
        if (!res.ok)
          throw new Error(
            (body as { error?: string } | null)?.error ?? 'Failed to create diary entry',
          );
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
          const without = prev.filter((e) => e.entryDate !== createdMeta.entryDate);
          return [...without, createdMeta].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
        });
        setSelectedDate(created.entryDate);
        setContent(createdContent);
        originalContentRef.current = JSON.stringify(createdContent);
        setIsDirty(false);
        setSaveState('saved');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create diary entry');
        setSaveState('error');
      } finally {
        setCreatingEntry(false);
        setLoadingEntry(false);
      }
    },
    [activeJournalId, diaryLocationEnabled, diaryQuery, entriesByDate, loadEntry, today],
  );

  const deleteEntryByDate = useCallback(
    async (dateOnly: string, currentSelectedDate: string | null) => {
      if (!dateOnly) return;
      setError(null);
      try {
        await fetch(`/api/diary/${dateOnly}${diaryQuery}`, { method: 'DELETE' });
        setEntries((prev) => prev.filter((e) => e.entryDate !== dateOnly));
        if (currentSelectedDate === dateOnly) {
          resetToEmpty();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete diary entry');
      }
    },
    [diaryQuery, resetToEmpty],
  );

  const handleContentChange = useCallback((nextContent: JSONContent) => {
    setContent(nextContent);
    setIsDirty(JSON.stringify(nextContent) !== originalContentRef.current);
    setSaveState('idle');
  }, []);

  return {
    entries,
    entriesByDate,
    groupedEntries,
    selectedDate,
    setSelectedDate,
    content,
    setContent,
    isDirty,
    setIsDirty,
    saveState,
    setSaveState,
    loadingList,
    loadingEntry,
    creatingEntry,
    error,
    setError,
    originalContentRef,
    resetToEmpty,
    fetchEntries,
    loadEntry,
    saveCurrentEntry,
    createEntryNow,
    deleteEntryByDate,
    handleContentChange,
  };
}
