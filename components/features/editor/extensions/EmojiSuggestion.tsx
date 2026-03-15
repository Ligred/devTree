'use client';

/**
 * EmojiSuggestion — typing ":" opens a searchable emoji dropdown.
 *
 * Uses @tiptap/suggestion. When the user types ":smile" the list filters
 * to matching emojis. If query >= 2 chars and no matches, the popup hides.
 * Selecting an emoji inserts the native Unicode character at the cursor.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { init, SearchIndex } from 'emoji-mart';

import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmojiItem = {
  id: string;
  name: string;
  native: string;
};

// ─── Default emojis shown when query is empty ─────────────────────────────────

const DEFAULT_EMOJIS: EmojiItem[] = [
  { id: 'thumbsup', name: 'Thumbs Up', native: '👍' },
  { id: 'heart', name: 'Red Heart', native: '❤️' },
  { id: 'smile', name: 'Smiling Face', native: '😊' },
  { id: 'laugh', name: 'Grinning Face', native: '😄' },
  { id: 'fire', name: 'Fire', native: '🔥' },
  { id: 'rocket', name: 'Rocket', native: '🚀' },
  { id: 'star', name: 'Star', native: '⭐' },
  { id: 'check', name: 'Check Mark', native: '✅' },
  { id: 'warning', name: 'Warning', native: '⚠️' },
  { id: 'bulb', name: 'Light Bulb', native: '💡' },
];

// ─── Data init (lazy singleton) ────────────────────────────────────────────────

let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (!initPromise) {
    const data = (await import('@emoji-mart/data')).default;
    initPromise = init({ data });
  }
  return initPromise;
}

// ─── EmojiSuggestionList component ────────────────────────────────────────────

type EmojiListProps = {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
};

export type EmojiListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const EmojiSuggestionList = forwardRef<EmojiListHandle, EmojiListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- calling setState in useEffect is valid React
    setSelectedIndex(0);
  }, [props.items]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (props.items.length === 0) return false;
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + props.items.length) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = props.items[selectedIndex];
        if (item) props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  return (
    <div className="tiptap-emoji-list border-border bg-popover max-h-64 min-w-48 overflow-y-auto rounded-xl border p-1 shadow-lg">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className={cn(
            'motion-interactive flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
            index === selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-accent/50',
          )}
          onClick={() => props.command(item)}
        >
          <span className="text-lg leading-none">{item.native}</span>
          <span className="text-muted-foreground text-xs">:{item.id}:</span>
        </button>
      ))}
    </div>
  );
});
EmojiSuggestionList.displayName = 'EmojiSuggestionList';

// ─── Suggestion options builder ───────────────────────────────────────────────

function buildSuggestionOptions(): Omit<SuggestionOptions<EmojiItem>, 'editor'> {
  return {
    char: ':',
    allowSpaces: false,
    startOfLine: false,

    items: async ({ query }: { query: string }): Promise<EmojiItem[]> => {
      if (!query) return DEFAULT_EMOJIS;
      await ensureInit();
      const results = await SearchIndex.search(query);
      if (!results || results.length === 0) {
        // Hide popup when query is long enough to expect a real match
        if (query.length >= 2) return [];
        return DEFAULT_EMOJIS;
      }
      return (results as { id: string; name: string; skins: { native: string }[] }[])
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          name: r.name,
          native: r.skins[0]?.native ?? '',
        }))
        .filter((r) => r.native);
    },

    render: () => {
      let reactRenderer: ReactRenderer<EmojiListHandle> | null = null;
      let popupEl: HTMLDivElement | null = null;
      let removeOutsideListener: (() => void) | null = null;
      let activeEditor: import('@tiptap/core').Editor | null = null;

      const cleanup = () => {
        if (removeOutsideListener) {
          removeOutsideListener();
          removeOutsideListener = null;
        }
        if (popupEl) {
          popupEl.remove();
          popupEl = null;
        }
        reactRenderer?.destroy();
        reactRenderer = null;
      };

      return {
        onStart(props) {
          activeEditor = props.editor;
          popupEl = document.createElement('div');
          popupEl.style.position = 'fixed';
          popupEl.style.zIndex = '9999';
          document.body.appendChild(popupEl);

          reactRenderer = new ReactRenderer(EmojiSuggestionList, {
            props,
            editor: props.editor,
          });

          if (reactRenderer.element) {
            popupEl.appendChild(reactRenderer.element);
          }

          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect) {
              popupEl.style.top = `${rect.bottom + 4}px`;
              popupEl.style.left = `${rect.left}px`;
            }
          }

          const onPointerDownOutside = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!popupEl || popupEl.contains(target)) return;
            props.editor.commands.blur();
          };
          document.addEventListener('pointerdown', onPointerDownOutside, true);
          removeOutsideListener = () =>
            document.removeEventListener('pointerdown', onPointerDownOutside, true);
        },

        onUpdate(props) {
          activeEditor = props.editor;
          reactRenderer?.updateProps(props);
          if (!props.clientRect) return;
          const rect = props.clientRect();
          if (rect && popupEl) {
            popupEl.style.top = `${rect.bottom + 4}px`;
            popupEl.style.left = `${rect.left}px`;
          }
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            // blur ends the suggestion session, which triggers onExit → cleanup
            activeEditor?.commands.blur();
            return true;
          }
          return reactRenderer?.ref?.onKeyDown(props.event) ?? false;
        },

        onExit() {
          activeEditor = null;
          cleanup();
        },
      };
    },

    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent((props as EmojiItem).native)
        .run();
    },
  };
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const EmojiSuggestion = Extension.create({
  name: 'emojiSuggestion',

  addOptions() {
    return {
      suggestion: buildSuggestionOptions(),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('emojiSuggestion'),
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
