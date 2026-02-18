'use client';

/**
 * WhiteboardBlock — a freehand-drawing canvas block.
 *
 * ─── WHY A CUSTOM CANVAS IMPLEMENTATION? ────────────────────────────────────
 *
 * Several mature whiteboard libraries exist (Excalidraw, tldraw, Konva), but:
 *
 *   Excalidraw: peer-depends on React 18 (this project uses React 19). Installing
 *   with --legacy-peer-deps works but silently breaks future compatibility checks.
 *
 *   tldraw: supports React 19 but weighs ~3 MB gzipped and introduces a complex
 *   bespoke rendering engine with its own state management that interacts
 *   awkwardly with Next.js SSR.
 *
 *   Custom Canvas API: zero extra dependencies, ~200 lines of straightforward
 *   code, aligns with this project's "learning" theme (Canvas API is a valuable
 *   skill), and performs well for the use-case (simple freehand notes, no
 *   collaboration needed).
 *
 * IMPROVEMENT IDEAS:
 *   - Add shape tools (rectangle, circle, line) with a separate "shape mode".
 *   - Add text annotation tool (place text labels on the canvas).
 *   - Implement undo/redo by storing strokes as path data rather than PNG.
 *   - Add `exportToSvg()` for vector-quality downloads.
 *   - Consider switching to tldraw if rich shape editing becomes a requirement.
 *
 * ─── DATA PERSISTENCE ────────────────────────────────────────────────────────
 *
 * The canvas is serialized to a base64 PNG data URL (via `canvas.toDataURL()`).
 * This is called after each completed stroke (mouseUp / touchEnd) so saves are
 * frequent but lightweight (only on stroke completion, not every mouse move).
 *
 * Trade-off vs. storing path data:
 *   + PNG is trivial to implement and render.
 *   + Small files for typical whiteboard sketches (5–50 KB).
 *   - Strokes are rasterized — individual shapes can't be re-selected or edited.
 *   - Background colour is baked in; switching themes doesn't re-render old strokes.
 *
 * For a future v2, storing SVG path data would enable undo, re-theming, and
 * export at any resolution.
 *
 * ─── THEME SUPPORT ───────────────────────────────────────────────────────────
 *
 * The canvas background and default pen colour follow the app theme.
 * When the theme changes, existing strokes (baked into the PNG) keep their
 * original colours — this is a known limitation of the raster approach.
 * A clear + redraw workflow is the intended workaround.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Pen, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WhiteboardBlockContent } from '../types';

// ─── Drawing constants ────────────────────────────────────────────────────────

/**
 * Colour palettes per theme.
 *
 * WHY separate palettes for light/dark?
 *   Drawing black strokes on a white background and white strokes on a dark
 *   background ensures maximum contrast in each mode.
 *
 * The first colour in each array is the default (black/white).
 */
const PALETTE_LIGHT = [
  '#111827', // near-black (default)
  '#DC2626', // red
  '#2563EB', // blue
  '#16A34A', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#DB2777', // pink
] as const;

const PALETTE_DARK = [
  '#F9FAFB', // near-white (default)
  '#F87171', // red
  '#60A5FA', // blue
  '#4ADE80', // green
  '#FCD34D', // yellow
  '#A78BFA', // violet
  '#F472B6', // pink
] as const;

const STROKE_WIDTHS = [2, 5, 12] as const;

/** Canvas resolution — higher than typical display for crisp lines on retina. */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 675; // 16:9

/** Background colours per theme (also baked into saved PNG). */
const BG_LIGHT = '#ffffff';
const BG_DARK = '#1e1e2e';

type Tool = 'pen' | 'eraser';

// ─── Types ────────────────────────────────────────────────────────────────────

type WhiteboardBlockProps = Readonly<{
  content: WhiteboardBlockContent;
  onChange: (content: WhiteboardBlockContent) => void;
  /** In view mode the toolbar is hidden and the canvas is non-interactive. */
  isEditing?: boolean;
}>;

// ─── Component ────────────────────────────────────────────────────────────────

export function WhiteboardBlock({
  content,
  onChange,
  isEditing = false,
}: WhiteboardBlockProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const bgColor = isDark ? BG_DARK : BG_LIGHT;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerDown = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>(palette[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(STROKE_WIDTHS[1]);

  /**
   * (Re-)draw the saved content onto the canvas when:
   *   - The component first mounts (load existing drawing).
   *   - The theme changes (redraw on correct background).
   *
   * WHY not update on `content.dataUrl` change?
   *   We update the `content` store on every stroke completion, which would
   *   cause an infinite loop if we also re-drew from `content` on every update.
   *   We only re-draw from external sources (initial load or theme switch).
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with the current theme colour
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (content.dataUrl) {
      const img = new Image();
      img.onload = () => { if (canvasRef.current) ctx.drawImage(img, 0, 0); };
      img.src = content.dataUrl;
    }
  // Theme change → re-draw existing content on the new background.
  // We intentionally exclude `content.dataUrl` from deps to avoid the loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // ─── Drawing helpers ──────────────────────────────────────────────────────

  /**
   * Convert a pointer / touch event position into canvas pixel coordinates.
   *
   * WHY scale?
   *   The canvas has a fixed pixel resolution (CANVAS_WIDTH × CANVAS_HEIGHT)
   *   but the DOM element may be displayed at a different size. The scale
   *   factor corrects for CSS-resized canvases so strokes land where the
   *   cursor actually is.
   */
  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const startStroke = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isEditing) return;
      const pos = getCanvasPos(e);
      if (!pos) return;
      isPointerDown.current = true;
      lastPos.current = pos;
    },
    [isEditing, getCanvasPos],
  );

  const continueStroke = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isPointerDown.current || !isEditing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getCanvasPos(e);
      if (!pos || !lastPos.current) return;

      /**
       * Eraser uses the background colour as "ink" — this creates a clean
       * erase effect without needing compositing operations.
       *
       * WHY not `ctx.clearRect`?
       *   clearRect makes pixels transparent, which would show the page
       *   background through the canvas. Using the bg colour paints opaque
       *   pixels that match the canvas background, preserving the solid look.
       */
      ctx.strokeStyle = tool === 'eraser' ? bgColor : color;
      ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastPos.current = pos;
    },
    [isEditing, getCanvasPos, tool, color, strokeWidth, bgColor],
  );

  const endStroke = useCallback(() => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    lastPos.current = null;

    // Serialize canvas to PNG and persist
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({ dataUrl: canvas.toDataURL('image/png') });
  }, [onChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    onChange({ dataUrl: '' });
  }, [bgColor, onChange]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Toolbar (edit mode only) ──────────────────────────────── */}
      {isEditing && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">

          {/* Tool selector */}
          <div className="flex gap-0.5 rounded-md bg-muted/70 p-0.5">
            {(['pen', 'eraser'] as Tool[]).map((t_) => (
              <button
                key={t_}
                type="button"
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded px-1.5 transition-colors',
                  tool === t_
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t_ === 'pen' ? t('whiteboard.pen') : t('whiteboard.eraser')}
                aria-label={t_ === 'pen' ? t('whiteboard.pen') : t('whiteboard.eraser')}
                onClick={() => setTool(t_)}
              >
                {t_ === 'pen' ? <Pen size={13} /> : <Eraser size={13} />}
              </button>
            ))}
          </div>

          {/* Colour palette */}
          <div className="flex items-center gap-1" aria-label="Pen colour">
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                title={c}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                  color === c && tool === 'pen'
                    ? 'scale-110 border-foreground'
                    : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
                onClick={() => { setColor(c); setTool('pen'); }}
              />
            ))}
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-1" aria-label="Stroke width">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                aria-label={`Stroke width ${w}`}
                title={`Stroke ${w}px`}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded border transition-colors',
                  strokeWidth === w
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-border hover:border-muted-foreground',
                )}
                onClick={() => setStrokeWidth(w)}
              >
                <span
                  aria-hidden
                  className="rounded-full bg-foreground"
                  style={{
                    width: Math.min(w * 1.8, 14),
                    height: Math.min(w * 1.8, 14),
                  }}
                />
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Clear */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={clearCanvas}
            title={t('whiteboard.clear')}
          >
            <Trash2 size={12} />
            {t('whiteboard.clear')}
          </button>
        </div>
      )}

      {/* ── Canvas area ─────────────────────────────────────────── */}
      <div className="relative" style={{ aspectRatio: '16 / 9' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={cn(
            'h-full w-full',
            isEditing ? 'cursor-crosshair' : 'cursor-default',
          )}
          style={{ backgroundColor: bgColor }}
          /* Mouse events */
          onMouseDown={startStroke}
          onMouseMove={continueStroke}
          onMouseUp={endStroke}
          onMouseLeave={endStroke}
          /* Touch events (mobile / stylus) */
          onTouchStart={startStroke}
          onTouchMove={continueStroke}
          onTouchEnd={endStroke}
        />

        {/* Empty state overlay */}
        {!content.dataUrl && !isEditing && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <p className="text-sm text-muted-foreground/40 italic">
              {t('whiteboard.empty')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
