'use client';

/**
 * DiagramBlock — a Mermaid-powered diagram editor with live preview,
 * diagram-type picker, zoom controls, and dark-mode support.
 *
 * ─── WHY MERMAID.JS? ──────────────────────────────────────────────────────────
 *
 * Mermaid is the best choice for a code-first, client-rendered diagramming
 * solution in a learning project:
 *   - No backend required: pure client-side SVG rendering.
 *   - 12+ diagram types (flowcharts, sequences, ER, Gantt, mind maps, …).
 *   - Widely used in real docs (GitHub, GitLab, Notion) — learned skills transfer.
 *   - Small bundle via dynamic import (~200 KB gzipped, loaded on demand).
 *
 * ALTERNATIVES CONSIDERED:
 *   - `@xyflow/react` (React Flow): excellent visual drag-and-drop node editor,
 *     but uses its own JSON format — not Mermaid. Great choice if you want a
 *     fully graphical editor; would need a custom Mermaid exporter.
 *   - `draw.io / mxGraph`: powerful but very heavy (~4 MB), requires iframe
 *     embedding or a separate server.
 *   - `D3.js`: low-level, requires hand-coding every diagram type from scratch.
 *
 * GRAPHICAL EDITING NOTE:
 *   Mermaid itself is code-only — there is no official graphical editor API.
 *   The closest practical addition would be an `@xyflow/react` mode that builds
 *   a visual flowchart and serialises it to Mermaid syntax on export.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add `@xyflow/react` graphical editor mode (flowchart only).
 *   - Add SVG download / copy-as-image button.
 *   - Persist zoom level per diagram in `DiagramBlockContent`.
 *   - Full-screen / lightbox mode for complex diagrams.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Code2,
  Eye,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DiagramBlockContent } from '../types';

// ─── Diagram type catalogue with starter templates ────────────────────────────

/**
 * Each entry gives the user a working starting point.
 * Templates are intentionally compact (< 15 lines) so they render quickly and
 * fit comfortably in the edit pane.
 */
const DIAGRAM_TYPES = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    template: `flowchart TD
    A[Start] --> B{Decision?}
    B -- Yes --> C[Do something]
    B -- No  --> D[Skip]
    C --> E[End]
    D --> E`,
  },
  {
    id: 'sequence',
    label: 'Sequence',
    template: `sequenceDiagram
    Alice->>Bob: Hello!
    Bob-->>Alice: Hi there
    Alice->>Bob: How are you?
    Bob-->>Alice: Fine, thanks`,
  },
  {
    id: 'class',
    label: 'Class',
    template: `classDiagram
    class Animal {
      +String name
      +sound() String
    }
    class Dog {
      +fetch() void
    }
    Animal <|-- Dog`,
  },
  {
    id: 'er',
    label: 'Entity Rel.',
    template: `erDiagram
    USER ||--o{ POST : writes
    POST ||--|{ TAG : has
    TAG {
        string name
    }`,
  },
  {
    id: 'gantt',
    label: 'Gantt',
    template: `gantt
    title Project Plan
    dateFormat YYYY-MM-DD
    section Phase 1
    Define scope : done, 2024-01-01, 3d
    Build core   : 5d
    section Phase 2
    Testing      : 3d
    Deploy       : 1d`,
  },
  {
    id: 'pie',
    label: 'Pie Chart',
    template: `pie title Tech Stack
    "React"      : 40
    "TypeScript" : 30
    "CSS"        : 20
    "Other"      : 10`,
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    template: `mindmap
  root((Learning))
    React
      Hooks
      Context
    TypeScript
      Types
      Generics`,
  },
] as const;

type DiagramTypeId = (typeof DIAGRAM_TYPES)[number]['id'];

// ─── Zoom constants ───────────────────────────────────────────────────────────

const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_DEFAULT = 1;

// ─── Component ────────────────────────────────────────────────────────────────

type DiagramBlockProps = Readonly<{
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
  /**
   * View mode: shows only the rendered diagram (no edit textarea, no tab
   * switcher, no diagram-type picker). Zoom controls remain available so
   * users can zoom into complex diagrams while reading.
   * Edit mode: full interface with edit/preview tabs and type picker.
   */
  isEditing?: boolean;
}>;

export function DiagramBlock({ content, onChange, isEditing = false }: DiagramBlockProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();

  const [tab, setTab] = useState<'edit' | 'preview'>('preview');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  /**
   * We keep a ref to the last rendered code + theme so we can skip redundant
   * Mermaid renders (e.g. switching tabs without changing the code).
   */
  const lastRender = useRef({ code: '', theme: '' });

  /**
   * The preview div that Mermaid renders its SVG into.
   *
   * WHY a ref instead of querySelector?
   *   `useRef` gives a stable, React-managed reference to the DOM node without
   *   needing to walk the DOM. It also works with SSR (the ref is null on the
   *   server and populated on the client after mount).
   */
  const previewRef = useRef<HTMLDivElement>(null);

  const renderId = useId().replaceAll(':', '');
  const code = content.code || DIAGRAM_TYPES[0].template;

  /**
   * Select the Mermaid theme based on the current app colour scheme.
   *
   * Mermaid has five built-in themes: 'default' | 'dark' | 'forest' |
   * 'neutral' | 'base'. 'dark' matches the app's dark mode palette.
   */
  const mermaidTheme = resolvedTheme === 'dark' ? 'dark' : 'default';

  // ─── Mermaid render ─────────────────────────────────────────────────────────

  const renderDiagram = useCallback(async () => {
    if (!previewRef.current) return;

    // Skip identical re-renders (same code + same theme → same SVG)
    if (code === lastRender.current.code && mermaidTheme === lastRender.current.theme) {
      return;
    }

    setError(null);
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        // strict: no script/link in labels (user diagram code → safe SVG output)
        securityLevel: 'strict',
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      });

      const { svg } = await mermaid.render(`mermaid-${renderId}`, code);

      if (previewRef.current) {
        // Mermaid-generated SVG only (no raw user HTML); securityLevel 'strict' reduces XSS surface
        previewRef.current.innerHTML = svg;
        const svgEl = previewRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.background = 'transparent';
          svgEl.removeAttribute('width');
        }
      }

      lastRender.current = { code, theme: mermaidTheme };
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diagram.renderError'));
      if (previewRef.current) previewRef.current.innerHTML = '';
    }
  }, [code, renderId, mermaidTheme, t]);

  // Re-render when switching to (or staying in) preview, or when theme changes
  useEffect(() => {
    if (tab === 'preview' || !isEditing) {
      void renderDiagram();
    }
  }, [tab, isEditing, renderDiagram]);

  /**
   * Live preview while editing: debounce by 600 ms.
   *
   * WHY 600 ms?
   *   Fast enough to feel responsive after a short pause, slow enough to avoid
   *   re-rendering on every single keystroke. Mermaid's async rendering is
   *   moderately expensive (~5–50 ms depending on diagram size).
   */
  useEffect(() => {
    if (tab !== 'edit') return;
    lastRender.current.code = ''; // force re-render with new content
    const timer = setTimeout(() => void renderDiagram(), 600);
    return () => clearTimeout(timer);
  }, [code, tab, renderDiagram]);

  // ─── Zoom controls ──────────────────────────────────────────────────────────

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)));
  const zoomReset = () => setZoom(ZOOM_DEFAULT);

  // ─── Diagram type detection ─────────────────────────────────────────────────

  /**
   * Infer the current diagram type from the first word of the code.
   * Used to highlight the active type in the picker and show its label.
   */
  const detectedTypeId = useMemo((): DiagramTypeId | null => {
    const firstWord = code.trim().split(/\s/)[0]?.toLowerCase() ?? '';
    const found = DIAGRAM_TYPES.find((dt) => firstWord.startsWith(dt.id.slice(0, 4)));
    return found?.id ?? null;
  }, [code]);

  const currentTypeLabel =
    DIAGRAM_TYPES.find((dt) => dt.id === detectedTypeId)?.label ?? 'Diagram';

  // ─── JSX ────────────────────────────────────────────────────────────────────

  // In view mode always show preview regardless of internal tab state
  const effectiveTab = isEditing ? tab : 'preview';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">

        {/* Tab buttons — only in edit mode */}
        {isEditing && (
          <>
            <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
              {(['preview', 'edit'] as const).map((t_) => (
                <button
                  key={t_}
                  type="button"
                  onClick={() => setTab(t_)}
                  className={cn(
                    'flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
                    tab === t_
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t_ === 'preview' ? <Eye size={11} /> : <Code2 size={11} />}
                  {t_ === 'preview' ? t('diagram.previewTab') : t('diagram.editTab')}
                </button>
              ))}
            </div>

            <div className="mx-1 h-3.5 w-px bg-border" aria-hidden />

            {/* Diagram-type picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypePickerOpen((v) => !v)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {currentTypeLabel}
                <ChevronDown
                  size={10}
                  className={cn('transition-transform', typePickerOpen && 'rotate-180')}
                />
              </button>

              {typePickerOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-card py-1 shadow-xl">
                  {DIAGRAM_TYPES.map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                      onClick={() => {
                        onChange({ code: dt.template });
                        setTypePickerOpen(false);
                        setTab('preview');
                        lastRender.current.code = '';
                      }}
                    >
                      {dt.label}
                      {dt.id === detectedTypeId && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1" />
          </>
        )}

        {/* In view mode, push zoom controls to the right without the edit toolbar */}
        {!isEditing && <div className="flex-1" />}

        {/* Zoom controls — available in both modes */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            title={t('diagram.zoomOut')}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            title={t('diagram.zoomReset')}
            className="min-w-10 rounded px-1 py-0.5 text-center font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            title={t('diagram.zoomIn')}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* ── Body: stacked on mobile, side-by-side on desktop in edit mode ── */}
      <div className={cn(effectiveTab === 'edit' && 'sm:grid sm:grid-cols-2')}>

        {/* Edit pane — only in edit mode and when edit tab is active */}
        {effectiveTab === 'edit' && (
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r">
            <textarea
              aria-label={t('diagram.placeholder')}
              className="h-44 w-full resize-none rounded-lg border border-border bg-background p-2.5 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-indigo-500/50"
              value={content.code}
              placeholder={t('diagram.placeholder')}
              onChange={(e) => onChange({ code: e.target.value })}
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('diagram.syntaxHint')}{' '}
              <a
                href="https://mermaid.js.org/syntax/flowchart.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 underline hover:text-indigo-600"
              >
                mermaid.js.org
              </a>
            </p>
          </div>
        )}

        {/* Preview pane — always in DOM so the ref is always valid. */}
        <div className={cn('p-3', effectiveTab === 'edit' && 'hidden sm:block')}>
          {error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-900 dark:bg-red-950/30">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {t('diagram.error')}
              </p>
              <pre className="mt-1 max-h-20 w-full overflow-auto rounded bg-red-100 px-3 py-2 text-left text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {error}
              </pre>
              <button
                type="button"
                onClick={() => setTab('edit')}
                className="mt-1 text-xs text-muted-foreground underline hover:text-foreground"
              >
                {t('diagram.editTab')} →
              </button>
            </div>
          ) : (
            /**
             * Two-layer overflow container for zoom.
             *
             * Outer `overflow-auto max-h-[260px]` — scrollable viewport for the
             * diagram. Large diagrams clip to 260 px and can be scrolled or zoomed
             * to fit.
             *
             * Inner div with `transform: scale(zoom)` — CSS scale for zoom.
             * `transform-origin: top left` keeps the diagram anchored to the
             * top-left corner, which is the most intuitive behaviour when zooming
             * in (content stays where you're looking).
             *
             * WHY CSS scale and not SVG viewBox manipulation?
             *   CSS scale is instant and GPU-accelerated. Manipulating the SVG
             *   viewBox requires re-parsing the SVG which is slower and complex.
             */
            <div className="overflow-auto" style={{ maxHeight: '260px' }}>
              <div
                ref={previewRef}
                className="min-h-[80px] origin-top-left transition-transform duration-150 [&_svg]:mx-auto"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
