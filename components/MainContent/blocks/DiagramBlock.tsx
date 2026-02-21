'use client';

/**
 * DiagramBlock — an Excalidraw-powered diagram editor with hand-drawn style,
 * shapes, arrows, text, and built-in Mermaid diagram support.
 *
 * ─── WHY EXCALIDRAW? ──────────────────────────────────────────────────────────
 *
 * Excalidraw is the best choice for a visual, sketch-style diagramming solution:
 *   - Hand-drawn aesthetic: professional yet approachable look.
 *   - Rich features: shapes, arrows, text, freehand drawing, images.
 *   - Mermaid integration: Insert Mermaid diagrams via the UI or /mermaid command.
 *   - Infinite canvas: pan and zoom to explore large diagrams.
 *   - Built-in collaboration: designed for real-time collaboration.
 *   - Export options: PNG, SVG, clipboard support.
 *
 * ─── MERMAID SUPPORT ──────────────────────────────────────────────────────────
 *   Excalidraw has native Mermaid support! Insert via:
 *   - Menu: Click "+" button → "Mermaid diagram"
 *   - Command: Type "/mermaid" while editing text
 *   - Mermaid elements are editable and render inline
 *
 * ─── PERSISTENCE ──────────────────────────────────────────────────────────────
 *   The entire Excalidraw state (elements, appState) is serialized to JSON and
 *   stored in the `code` field of DiagramBlockContent for simplicity.
 */

import '@excalidraw/excalidraw/index.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FullscreenBlockOverlay } from './FullscreenBlockOverlay';
import type { DiagramBlockContent } from '../types';

// Dynamic import to avoid SSR issues
const ExcalidrawComponent = dynamic(
  async () => {
    const module = await import('@excalidraw/excalidraw');
    return { default: module.Excalidraw };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
        Loading Excalidraw editor...
      </div>
    ),
  }
);

// ─── Component ────────────────────────────────────────────────────────────────

type DiagramBlockProps = Readonly<{
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
  /**
   * View mode: shows the diagram in read-only mode.
   * Edit mode: full editing interface with all tools.
   */
  isEditing?: boolean;
}>;

// Extract DiagramContent as a separate component
function DiagramContent({
  fullscreen,
  isEditing,
  content,
  onChange,
  onFullscreenToggle,
  t,
  theme,
}: Readonly<{
  fullscreen: boolean;
  isEditing: boolean;
  content: DiagramBlockContent;
  onChange: (content: DiagramBlockContent) => void;
  onFullscreenToggle: () => void;
  t: (key: string) => string;
  theme: 'light' | 'dark';
}>) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse initial state
  const parseInitialState = () => {
    if (!content.code) return { elements: [], appState: {} };
    try {
      return JSON.parse(content.code);
    } catch {
      return { elements: [], appState: {} };
    }
  };

  const initialData = parseInitialState();

  const handleChange = useCallback(
    (elements: readonly any[], state: any) => {
      if (!isEditing) return;

      // Debounce saves to avoid too many updates
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const data = {
            elements: Array.from(elements),
            appState: {
              viewBackgroundColor: state.viewBackgroundColor,
              currentItemStrokeColor: state.currentItemStrokeColor,
              currentItemBackgroundColor: state.currentItemBackgroundColor,
              currentItemFillStyle: state.currentItemFillStyle,
              currentItemStrokeWidth: state.currentItemStrokeWidth,
              currentItemRoughness: state.currentItemRoughness,
              currentItemOpacity: state.currentItemOpacity,
              gridSize: state.gridSize,
            },
          };
          onChange({ code: JSON.stringify(data) });
        } catch (err) {
          console.warn('Failed to save diagram state:', err);
        }
      }, 500);
    },
    [onChange, isEditing]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-card',
        fullscreen ? 'h-screen w-screen' : 'rounded-xl border border-border h-125'
      )}
    >
      {/* Fullscreen button - only show in normal mode and when editing */}
      {!fullscreen && isEditing && (
        <button
          type="button"
          onClick={onFullscreenToggle}
          title={t('ui.fullscreen')}
          className="absolute right-2 top-2 z-1000 rounded-md bg-background/90 p-2 text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground"
        >
          <Maximize2 size={16} />
        </button>
      )}

      {/* Excalidraw editor */}
      <div className="h-full w-full">
        <ExcalidrawComponent
          initialData={initialData}
          onChange={handleChange}
          theme={theme}
          viewModeEnabled={!isEditing}
          zenModeEnabled={false}
          gridModeEnabled={false}
        />
      </div>
    </div>
  );
}

export function DiagramBlock({ content, onChange, isEditing = false }: DiagramBlockProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';

  // If fullscreen, render using FullscreenBlockOverlay
  if (isFullscreen) {
    return (
      <FullscreenBlockOverlay
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={t('diagram.title') || 'Diagram'}
      >
        <DiagramContent
          fullscreen
          isEditing={isEditing}
          content={content}
          onChange={onChange}
          onFullscreenToggle={() => setIsFullscreen(false)}
          t={t}
          theme={theme}
        />
      </FullscreenBlockOverlay>
    );
  }

  // Normal diagram block (non-fullscreen)
  return (
    <DiagramContent
      fullscreen={false}
      isEditing={isEditing}
      content={content}
      onChange={onChange}
      onFullscreenToggle={() => setIsFullscreen(true)}
      t={t}
      theme={theme}
    />
  );
}

