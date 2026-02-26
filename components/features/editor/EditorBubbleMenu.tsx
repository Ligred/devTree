'use client';

/**
 * EditorBubbleMenu — formatting + comment + bookmark toolbar shown on text selection.
 *
 * Tiptap v3's BubbleMenu does not ship in @tiptap/react — we implement it
 * manually using the editor selection events and a portal fixed to the viewport.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Bookmark,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  MessageSquare,
  Strikethrough,
  Tag,
  Underline as UnderlineIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { ToolbarButton } from './EditorToolbar';

const HIGHLIGHT_COLORS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
];

/** Custom atom node type names that should NOT show the bubble menu. */
const ATOM_TYPES = [
  'codeBlockNode',
  'checklistNode',
  'canvasNode',
  'audioNode',
  'videoNode',
  'imageNode',
  'linkCardNode',
  'tableBlockNode',
];

type Coords = { top: number; left: number };

type EditorBubbleMenuProps = Readonly<{
  editor: Editor;
}>;

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const linkInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });

  const [linkOpen, setLinkOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ── Compute visibility and position ──────────────────────────────────────

  useEffect(() => {
    const update = () => {
      const { state, view } = editor;
      const { selection } = state;
      const { empty, from, to } = selection;

      // Hide for empty selections or atom node selections
      const shouldHide = empty || ATOM_TYPES.some((t) => editor.isActive(t));
      if (shouldHide) {
        setVisible(false);
        return;
      }

      // Get bounding rect for the selection
      try {
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const box = view.dom.getBoundingClientRect();
        const scrollTop = window.scrollY;
        const scrollLeft = window.scrollX;

        // Place menu centred above the selection
        const menuWidth = menuRef.current?.offsetWidth ?? 320;
        const selMiddleX = (start.left + end.left) / 2 + scrollLeft;
        const selTop = Math.min(start.top, end.top) + scrollTop;

        setCoords({
          top: selTop - 48, // ~3rem above the selection
          left: Math.max(
            8 + scrollLeft + box.left,
            Math.min(selMiddleX - menuWidth / 2, scrollLeft + box.right - menuWidth - 8),
          ),
        });
        setVisible(true);
      } catch {
        setVisible(false);
      }
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  // ── Link ─────────────────────────────────────────────────────────────────

  const setLink = useCallback(() => {
    const url = linkInputRef.current?.value?.trim() ?? '';
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkOpen(false);
  }, [editor]);

  // ── Comment ──────────────────────────────────────────────────────────────

  const applyComment = useCallback(() => {
    const text = commentInputRef.current?.value?.trim() ?? '';
    if (text) {
      const id = `comment-${crypto.randomUUID()}`;
      (
        editor.chain().focus() as unknown as {
          setComment: (a: { id: string; commentText: string }) => { run: () => boolean };
        }
      )
        .setComment({ id, commentText: text })
        .run();
    }
    setCommentOpen(false);
  }, [editor]);

  const removeComment = useCallback(() => {
    (
      editor.chain().focus() as unknown as {
        unsetComment: () => { run: () => boolean };
      }
    )
      .unsetComment?.()
      .run();
    setCommentOpen(false);
  }, [editor]);

  // ── Inline Tag ──────────────────────────────────────────────────

  const applyInlineTag = useCallback(() => {
    const tag = tagInputRef.current?.value?.trim().toLowerCase() ?? '';
    if (tag) {
      editor.chain().focus().setInlineTag({ tag }).run();
    } else {
      editor.chain().focus().unsetInlineTag().run();
    }
    setTagOpen(false);
  }, [editor]);

  const removeInlineTag = useCallback(() => {
    editor.chain().focus().unsetInlineTag().run();
    setTagOpen(false);
  }, [editor]);

  // ── Bookmark ─────────────────────────────────────────────────────────────

  const toggleBookmark = useCallback(() => {
    if (editor.isActive('bookmark')) {
      editor.chain().focus().unsetBookmark().run();
    } else {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, '').slice(0, 60);
      editor
        .chain()
        .focus()
        .setBookmark({ id: `bm-${crypto.randomUUID()}`, label: text })
        .run();
    }
  }, [editor]);

  // ── Portal render ─────────────────────────────────────────────────────────

  if (!visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 50 }}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
    >
      <div className="border-border bg-card flex items-center gap-0.5 rounded-xl border px-1.5 py-1 shadow-lg">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton
          title="Inline code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={13} />
        </ToolbarButton>

        <span className="bg-border mx-0.5 h-4 w-px" />

        {/* Highlight */}
        <div className="relative">
          <ToolbarButton
            title="Highlight"
            active={!!editor.getAttributes('highlight').color}
            onClick={() => {
              setHighlightOpen((v) => !v);
              setLinkOpen(false);
              setCommentOpen(false);
            }}
          >
            <Highlighter size={13} />
          </ToolbarButton>
          {highlightOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setHighlightOpen(false)}
              />
              <div className="border-border bg-popover absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-lg border p-1.5">
                {HIGHLIGHT_COLORS.map(({ name, value }) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    className={cn(
                      'border-border h-5 w-5 rounded border',
                      !value && 'bg-transparent',
                    )}
                    style={{ backgroundColor: value || undefined }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (value) editor.chain().focus().toggleHighlight({ color: value }).run();
                      else editor.chain().focus().unsetHighlight().run();
                      setHighlightOpen(false);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            title="Link"
            active={editor.isActive('link')}
            onClick={() => {
              setLinkOpen((v) => !v);
              setCommentOpen(false);
              setHighlightOpen(false);
            }}
          >
            <LinkIcon size={13} />
          </ToolbarButton>
          {linkOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setLinkOpen(false)} />
              <div className="border-border bg-popover absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border p-2 shadow-lg">
                <input
                  ref={linkInputRef}
                  type="url"
                  placeholder="https://"
                  className="border-border bg-background w-full rounded border px-2 py-1.5 text-xs outline-none"
                  defaultValue={editor.getAttributes('link').href || ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setLink();
                    } else if (e.key === 'Escape') {
                      setLinkOpen(false);
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="bg-primary text-primary-foreground mt-1.5 rounded px-2 py-1 text-xs hover:opacity-90"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLink();
                  }}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </div>

        <span className="bg-border mx-0.5 h-4 w-px" />

        {/* Comment */}
        <div className="relative">
          <ToolbarButton
            title="Comment"
            active={editor.isActive('comment')}
            onClick={() => {
              const opening = !commentOpen;
              setCommentOpen((v) => !v);
              setLinkOpen(false);
              setHighlightOpen(false);
              if (opening) {
                const attrs = editor.getAttributes('comment');
                setTimeout(() => {
                  if (commentInputRef.current) {
                    commentInputRef.current.value = attrs.commentText || '';
                  }
                }, 0);
              }
            }}
          >
            <MessageSquare size={13} />
          </ToolbarButton>
          {commentOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setCommentOpen(false)}
              />
              <div className="border-border bg-popover absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border p-2 shadow-lg">
                <textarea
                  ref={commentInputRef}
                  placeholder="Add a note…"
                  rows={2}
                  className="border-border bg-background w-full resize-none rounded border px-2 py-1.5 text-xs outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setCommentOpen(false);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <div className="mt-1.5 flex gap-1">
                  <button
                    type="button"
                    className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs hover:opacity-90"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyComment();
                    }}
                  >
                    Apply
                  </button>
                  {editor.isActive('comment') && (
                    <button
                      type="button"
                      className="border-border hover:bg-accent rounded border px-2 py-1 text-xs"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        removeComment();
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bookmark */}
        <ToolbarButton
          title={editor.isActive('bookmark') ? 'Remove bookmark' : 'Add bookmark'}
          active={editor.isActive('bookmark')}
          onClick={toggleBookmark}
        >
          <Bookmark size={13} />
        </ToolbarButton>

        <span className="bg-border mx-0.5 h-4 w-px" />

        {/* Inline Tag */}
        <div className="relative">
          <ToolbarButton
            title={editor.isActive('inlineTag') ? 'Edit tag' : 'Add inline tag'}
            active={editor.isActive('inlineTag')}
            onClick={() => {
              const opening = !tagOpen;
              setTagOpen((v) => !v);
              setLinkOpen(false);
              setCommentOpen(false);
              setHighlightOpen(false);
              if (opening) {
                const existingTag = editor.getAttributes('inlineTag').tag ?? '';
                setTimeout(() => {
                  if (tagInputRef.current) {
                    tagInputRef.current.value = existingTag;
                    tagInputRef.current.select();
                  }
                }, 0);
              }
            }}
          >
            <Tag size={13} />
          </ToolbarButton>
          {tagOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setTagOpen(false)} />
              <div className="border-border bg-popover absolute bottom-full left-0 z-20 mb-2 w-52 rounded-lg border p-2 shadow-lg">
                <p className="text-muted-foreground mb-1.5 text-[10px] font-medium">
                  Tag selected text
                </p>
                <input
                  ref={tagInputRef}
                  type="text"
                  placeholder="e.g. important, review…"
                  className="border-border bg-background w-full rounded border px-2 py-1.5 text-xs outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyInlineTag();
                    else if (e.key === 'Escape') setTagOpen(false);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <div className="mt-1.5 flex gap-1">
                  <button
                    type="button"
                    className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs hover:opacity-90"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyInlineTag();
                    }}
                  >
                    Apply
                  </button>
                  {editor.isActive('inlineTag') && (
                    <button
                      type="button"
                      className="border-border hover:bg-accent rounded border px-2 py-1 text-xs"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        removeInlineTag();
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
