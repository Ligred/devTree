'use client';

/**
 * CodeBlock — A full-featured code editor block powered by Monaco Editor.
 *
 * WHY Monaco Editor?
 *   Monaco is the same editor that powers VS Code. It provides syntax highlighting
 *   for 40+ languages, proper code editing semantics (auto-indent, bracket matching,
 *   tab handling), and is deeply familiar to developers.
 *
 *   Trade-off: Monaco weighs ~2 MB. We mitigate this with Next.js `dynamic()` and
 *   `ssr: false` — the editor bundle is loaded lazily, only in the browser, and only
 *   when the component mounts. This keeps the initial page-load payload small.
 *
 * THEME SYNCHRONISATION
 *   Monaco has its own internal theme system ('vs' for light, 'vs-dark' for dark).
 *   We read the resolved theme via `useTheme()` from next-themes and pass the
 *   matching Monaco theme. We use `resolvedTheme` (not `theme`) because `theme`
 *   can be "system" — `resolvedTheme` always gives the actual OS-level value.
 *
 *   For the header bar colours we use Tailwind's `dark:` variant, which is
 *   applied/removed by next-themes setting the `dark` class on <html>.
 *
 * IMPROVEMENT IDEAS:
 *   - Add a "Copy code" button (navigator.clipboard.writeText).
 *   - Allow resizing the editor height via a drag handle at the bottom.
 *   - Let users pick from ALL Monaco languages via a searchable popover.
 *   - Show line count / character count in the header bar.
 */

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import type { CodeBlockContent } from '../types';

/**
 * Monaco Editor loaded dynamically with SSR disabled.
 *
 * WHY dynamic + ssr:false?
 *   Monaco uses browser-only APIs (Web Workers, ResizeObserver, DOM) that simply
 *   do not exist in the Node.js environment where Next.js renders on the server.
 *   Without `ssr: false` the build would crash or silently fall back to an empty
 *   render. The `{ ssr: false }` option tells Next.js to skip this import during
 *   server-side rendering and only run it in the browser.
 */
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false },
);

/**
 * Curated list of syntax-highlighting languages.
 *
 * WHY a fixed list?
 *   Monaco supports 70+ languages. Showing all would overwhelm users with
 *   choices they'll rarely use. This list covers the most common languages
 *   for a developer learning project.
 *
 * IMPROVEMENT: Add a search/filter input to the dropdown so power users can
 * find any language Monaco supports without bloating the visible list.
 */
const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'html',
  'css',
  'json',
  'yaml',
  'bash',
  'sql',
  'markdown',
];

type CodeBlockProps = Readonly<{
  content: CodeBlockContent;
  onChange: (content: CodeBlockContent) => void;
}>;

export function CodeBlock({ content, onChange }: CodeBlockProps) {
  const { code, language = 'javascript' } = content;
  const [langOpen, setLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Resolve the current theme for Monaco.
   *
   * WHY resolvedTheme instead of theme?
   *   `theme` from useTheme can be 'system', which is not a valid Monaco theme.
   *   `resolvedTheme` already resolves 'system' to either 'light' or 'dark' based
   *   on the OS media query, so we can map it directly to a Monaco theme name.
   *
   *   We default to 'vs-dark' when resolvedTheme is undefined (SSR/loading)
   *   because code editors conventionally use dark themes and the Monaco component
   *   is not rendered on the server anyway (ssr: false).
   */
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === 'light' ? 'vs' : 'vs-dark';

  /** Copy code to clipboard with a brief "Copied!" confirmation state. */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in insecure contexts (e.g. HTTP, iframes).
      // Silently ignore — the user still has full access to the editor text.
    }
  };

  return (
    /**
     * Container colours match Monaco's built-in themes:
     *   Light mode → Monaco 'vs'      → white background (#ffffff)
     *   Dark mode  → Monaco 'vs-dark' → dark background (#1e1e1e)
     *
     * WHY Tailwind dark: variants instead of inline styles?
     *   Tailwind variants are resolved at build time (no JS bundle cost) and
     *   prevent a Flash Of Unstyled Content (FOUC) because they activate via
     *   the CSS `dark` class set by next-themes before React hydrates.
     */
    <div className="overflow-hidden rounded-xl border border-border shadow-sm bg-white dark:bg-[#1e1e1e]">
      {/* Header bar — language selector, label, copy button */}
      <div className="flex items-center justify-between border-b border-border bg-gray-100 px-3 py-1.5 dark:border-[#3e3e3e] dark:bg-[#2d2d2d]">
        {/* Language selector dropdown */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2 py-1 font-mono text-xs text-zinc-700 transition-colors hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
            onClick={() => setLangOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
          >
            {language}
            <ChevronDown
              size={11}
              className={cn('transition-transform', langOpen && 'rotate-180')}
            />
          </button>

          {/**
           * Language dropdown list.
           *
           * WHY max-h + overflow-y-auto?
           *   Without a height cap the list would extend off-screen on small
           *   viewports or when many languages are shown. The scroll constraint
           *   keeps it contained without requiring a portal.
           */}
          {langOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-40 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-xl dark:border-[#3e3e3e] dark:bg-[#252526]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-1.5 font-mono text-xs text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                  onClick={() => {
                    onChange({ ...content, language: lang });
                    setLangOpen(false);
                  }}
                >
                  {lang}
                  {lang === language && (
                    <Check size={11} className="text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy code'}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <Copy size={11} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Code</span>
        </div>
      </div>

      {/* Monaco editor area */}
      <div className="min-h-[180px]">
        {/**
         * WHY defaultValue instead of value?
         *   Monaco manages its own internal document model. Passing `value` as a
         *   controlled prop would re-create the editor on every keystroke (expensive
         *   and causes caret jumps). `defaultValue` initialises the model once;
         *   subsequent edits are captured via the `onChange` callback which fires
         *   at the Monaco document level — much more efficient.
         *
         * IMPROVEMENT: To support external content updates (e.g. syncing via a
         * server), use the `onMount` callback to get the editor instance and call
         * `editor.setValue()` imperatively only when the prop changes.
         */}
        <MonacoEditor
          height="240px"
          language={language}
          defaultValue={code}
          theme={editorTheme}
          onChange={(value) => onChange({ ...content, code: value ?? '' })}
          options={{
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
            // fontFamily keeps code legible on all platforms
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          }}
        />
      </div>
    </div>
  );
}
