'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eye, Code2, AlertTriangle } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DiagramBlockContent } from '../types';

const DEFAULT_CODE = `flowchart TD
    A[Start] --> B{Decision?}
    B -- Yes --> C[Do something]
    B -- No  --> D[Do nothing]
    C --> E[End]
    D --> E`;

type Tab = 'edit' | 'preview';

type DiagramBlockProps = Readonly<{
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
}>;

export function DiagramBlock({ content, onChange }: DiagramBlockProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('preview');
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replaceAll(':', '');

  const code = content.code || DEFAULT_CODE;

  const renderDiagram = useCallback(async () => {
    if (!previewRef.current) return;
    setError(null);
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      });
      const id = `mermaid-${renderId}`;
      const { svg } = await mermaid.render(id, code);
      if (previewRef.current) {
        previewRef.current.innerHTML = svg;
        // Make SVG responsive
        const svgEl = previewRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
          svgEl.removeAttribute('width');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diagram.renderError'));
      if (previewRef.current) previewRef.current.innerHTML = '';
    }
  }, [code, renderId, t]);

  useEffect(() => {
    if (tab === 'preview') {
      void renderDiagram();
    }
  }, [tab, renderDiagram]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            tab === 'preview'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Eye size={12} />
          {t('diagram.previewTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            tab === 'edit'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Code2 size={12} />
          {t('diagram.editTab')}
        </button>
      </div>

      {/* Edit pane */}
      {tab === 'edit' && (
        <div className="p-3">
          <textarea
            className="w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/50"
            rows={10}
            value={content.code}
            placeholder={t('diagram.placeholder')}
            onChange={(e) => onChange({ code: e.target.value })}
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Uses{' '}
            <a
              href="https://mermaid.js.org/syntax/flowchart.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 underline hover:text-indigo-600"
            >
              Mermaid
            </a>{' '}
            syntax. Supports flowcharts, sequence diagrams, ERDs, Gantt charts, and more.
          </p>
        </div>
      )}

      {/* Preview pane */}
      {tab === 'preview' && (
        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900 dark:bg-red-950/30">
              <AlertTriangle size={20} className="text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {t('diagram.error')}
              </p>
              <p className="text-xs text-red-500/80 dark:text-red-500/60">
                {t('diagram.errorHint')}
              </p>
              <pre className="mt-1 max-h-24 overflow-auto rounded bg-red-100 px-3 py-2 text-left text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {error}
              </pre>
            </div>
          ) : (
            <div
              ref={previewRef}
              className="flex min-h-[120px] items-center justify-center [&>svg]:mx-auto"
            />
          )}
        </div>
      )}
    </div>
  );
}
