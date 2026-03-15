'use client';
import { useCallback, useState } from 'react';

import type { DiaryTemplate } from '../types';

export function useDiaryTemplates(activeJournalId: string | null) {
  const [templates, setTemplates] = useState<DiaryTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!activeJournalId) {
      setTemplates([]);
      return;
    }
    setLoadingTemplates(true);
    setError(null);
    try {
      const res = await fetch(`/api/diary/journals/${activeJournalId}/templates`);
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | DiaryTemplate[]
        | null;
      if (!res.ok)
        throw new Error((body as { error?: string } | null)?.error ?? 'Failed to load templates');
      setTemplates(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [activeJournalId]);

  const createTemplate = useCallback(
    async (name: string, body: string): Promise<DiaryTemplate | null> => {
      if (!activeJournalId) return null;
      setError(null);
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
        if (!res.ok)
          throw new Error(
            (payload as { error?: string } | null)?.error ?? 'Failed to create template',
          );
        const created = payload as DiaryTemplate;
        setTemplates((prev) => [...prev, created]);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create template');
        return null;
      }
    },
    [activeJournalId],
  );

  const updateTemplate = useCallback(
    async (id: string, name: string, body: string): Promise<DiaryTemplate | null> => {
      if (!activeJournalId) return null;
      setError(null);
      try {
        const res = await fetch(`/api/diary/journals/${activeJournalId}/templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, body }),
        });
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | DiaryTemplate
          | null;
        if (!res.ok)
          throw new Error(
            (payload as { error?: string } | null)?.error ?? 'Failed to update template',
          );
        const updated = payload as DiaryTemplate;
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update template');
        return null;
      }
    },
    [activeJournalId],
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      if (!activeJournalId) return false;
      setError(null);
      try {
        const res = await fetch(`/api/diary/journals/${activeJournalId}/templates/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? 'Failed to delete template');
        }
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete template');
        return false;
      }
    },
    [activeJournalId],
  );

  return {
    templates,
    loadingTemplates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    error,
  };
}
