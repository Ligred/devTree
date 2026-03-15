'use client';
import { useCallback, useMemo, useState } from 'react';

import type { DiaryJournal } from '../types';

export function useDiaryJournals() {
  const [journals, setJournals] = useState<DiaryJournal[]>([]);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeJournal = useMemo(
    () => journals.find((j) => j.id === activeJournalId) ?? null,
    [journals, activeJournalId],
  );

  const fetchJournals = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/diary/journals');
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryJournal[]
        | null;
      if (!res.ok)
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load journals');
      const next = Array.isArray(body) ? body : [];
      setJournals(next);
      setActiveJournalId((prev) => prev ?? next[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journals');
    }
  }, []);

  const createJournal = useCallback(async (name: string): Promise<DiaryJournal | null> => {
    setError(null);
    try {
      const res = await fetch('/api/diary/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | DiaryJournal | null;
      if (!res.ok)
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to create journal');
      const created = body as DiaryJournal;
      setJournals((prev) => [...prev, created]);
      setActiveJournalId(created.id);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journal');
      return null;
    }
  }, []);

  const renameJournal = useCallback(
    async (name: string): Promise<boolean> => {
      if (!activeJournalId) return false;
      setError(null);
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
        if (!res.ok)
          throw new Error((body as { error?: string } | null)?.error ?? 'Failed to rename journal');
        const updated = body as DiaryJournal;
        setJournals((prev) =>
          prev.map((j) => (j.id === updated.id ? { ...j, name: updated.name } : j)),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rename journal');
        return false;
      }
    },
    [activeJournalId],
  );

  return {
    journals,
    activeJournalId,
    setActiveJournalId,
    activeJournal,
    fetchJournals,
    createJournal,
    renameJournal,
    error,
  };
}
