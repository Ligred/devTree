'use client';

/**
 * TextBlock — a rich-text editor block powered by Tiptap.
 *
 * Features:
 *   Headings (H1–H3), Bold, Italic, Underline, Strikethrough, Inline code,
 *   Code block (fenced block), Lists (bullet, ordered), Blockquote, Horizontal rule,
 *   Text alignment (left, center, right, justify),
 *   Link (add/edit/remove), Undo/Redo,
 *   Text color and highlight (background) color pickers,
 *   Inline comments (custom mark; comment text shown in tooltip on hover).
 *
 * ToolbarButton uses onMouseDown + preventDefault so the editor keeps focus
 * when clicking a button (see comment in ToolbarButton).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  CodeSquare,
  Minus,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  MessageSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Undo2,
  Redo2,
} from 'lucide-react';

import { CommentMark } from '@/lib/tiptap-comment-mark';
import { cn } from '@/lib/utils';

const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
];

type ToolbarButtonProps = Readonly<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}>;

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        // preventDefault so the editor doesn't lose focus when the button is clicked (required for formatting to apply).
        e.preventDefault();
        onClick();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  );
}

type TextBlockProps = Readonly<{
  content: string;
  onChange: (content: string) => void;
  isEditing?: boolean;
}>;

export function TextBlock({ content, onChange, isEditing = false }: TextBlockProps) {
  const linkInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentTooltip, setCommentTooltip] = useState<{ text: string; left: number; top: number } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: isEditing,
    extensions: [
      // StarterKit includes codeBlock (fenced <pre><code>); we use it for the Code block toolbar button.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Write your notes…' }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      CommentMark, // Custom inline-comment mark; text is stored in data-comment-text and shown in a tooltip on hover.
    ],
    content,
    onUpdate: ({ editor: e }) => {
      if (isEditing) onChange(e.getHTML());
    },
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== isEditing) editor.setEditable(isEditing);
  }, [editor, isEditing]);

  // Show comment text in a tooltip when hovering over a comment span (data-comment-text holds escaped text from CommentMark).
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const span = target.closest?.('span[data-comment-text]');
    if (span) {
      const text = (span as HTMLElement).dataset.commentText;
      if (text) {
        const rect = span.getBoundingClientRect();
        setCommentTooltip({
          text: text ?? '',
          left: rect.left + rect.width / 2,
          top: rect.top - 4,
        });
        return;
      }
    }
    setCommentTooltip(null);
  }, []);

  const handleEditorMouseLeave = useCallback(() => {
    setCommentTooltip(null);
  }, []);

  const setLink = () => {
    if (!editor) return;
    const url = linkInputRef.current?.value?.trim() || editor.getAttributes('link').href || '';
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  const unsetLink = () => {
    editor?.chain().focus().unsetLink().run();
    setLinkOpen(false);
  };

  // setComment/unsetComment come from our CommentMark; ChainedCommands typings don't include them, so we use a type assertion.
  const applyComment = () => {
    if (!editor) return;
    const text = commentInputRef.current?.value?.trim() ?? '';
    if (text) {
      const id = `comment-${crypto.randomUUID?.() ?? Date.now()}`;
      (editor.chain().focus() as unknown as { setComment: (a: { id: string; commentText: string }) => { run: () => boolean } }).setComment({ id, commentText: text }).run();
    }
    setCommentOpen(false);
  };

  const removeComment = () => {
    (editor?.chain().focus() as unknown as { unsetComment: () => { run: () => boolean } }).unsetComment?.().run();
    setCommentOpen(false);
  };

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      {isEditing && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
          {/* Headings */}
          <ToolbarButton
            title="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 size={14} />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Text formatting */}
          <ToolbarButton
            title="Bold (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Italic (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Underline (Ctrl+U)"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code size={14} />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Alignment */}
          <ToolbarButton
            title="Align left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Align center"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Align right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Justify"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <AlignJustify size={14} />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Lists & blockquote */}
          <ToolbarButton
            title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Ordered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <CodeSquare size={14} />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Text color */}
          <div className="relative">
            <ToolbarButton
              title="Text color"
              onClick={() => {
                setColorOpen((v: boolean) => !v);
                setHighlightOpen(false);
                setLinkOpen(false);
              }}
            >
              <span
                className="inline-block h-4 w-4 rounded border border-border"
                style={{
                  backgroundColor: editor.getAttributes('textStyle').color || 'currentColor',
                }}
              />
            </ToolbarButton>
            {colorOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setColorOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover p-2 shadow-lg">
                  {TEXT_COLORS.map(({ name, value }) => (
                    <button
                      key={name || 'default'}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (value) editor.chain().focus().setColor(value).run();
                        else editor.chain().focus().unsetColor().run();
                        setColorOpen(false);
                      }}
                    >
                      {value ? (
                        <span
                          className="h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: value }}
                        />
                      ) : (
                        <span className="h-4 w-4 rounded border border-border bg-transparent" />
                      )}
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <ToolbarButton
              title="Highlight"
              active={!!editor.getAttributes('highlight').color}
              onClick={() => {
                setHighlightOpen((v: boolean) => !v);
                setColorOpen(false);
                setLinkOpen(false);
              }}
            >
              <Highlighter size={14} />
            </ToolbarButton>
            {highlightOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setHighlightOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover p-2 shadow-lg">
                  {HIGHLIGHT_COLORS.map(({ name, value }) => (
                    <button
                      key={name || 'none'}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (value) editor.chain().focus().toggleHighlight({ color: value }).run();
                        else editor.chain().focus().unsetHighlight().run();
                        setHighlightOpen(false);
                      }}
                    >
                      {value ? (
                        <span
                          className="h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: value }}
                        />
                      ) : (
                        <span className="h-4 w-4 rounded border border-border bg-transparent" />
                      )}
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Link */}
          <div className="relative">
            <ToolbarButton
              title={editor.isActive('link') ? 'Edit link' : 'Add link'}
              active={editor.isActive('link')}
              onClick={() => {
                setLinkOpen((v: boolean) => !v);
                setColorOpen(false);
                setHighlightOpen(false);
              }}
            >
              <LinkIcon size={14} />
            </ToolbarButton>
            {linkOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setLinkOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-popover p-2 shadow-lg">
                  <input
                    ref={linkInputRef}
                    type="url"
                    placeholder="https://"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                    defaultValue={editor.getAttributes('link').href || ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setLink();
                      if (e.key === 'Escape') setLinkOpen(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLink();
                      }}
                    >
                      Apply
                    </button>
                    {editor.isActive('link') && (
                      <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          unsetLink();
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

          {/* Comment (custom mark; tooltip on hover) */}
          <div className="relative">
            <ToolbarButton
              title={editor.isActive('comment') ? 'Edit comment' : 'Add comment'}
              active={editor.isActive('comment')}
              onClick={() => {
                setCommentOpen((v: boolean) => !v);
                setColorOpen(false);
                setHighlightOpen(false);
                setLinkOpen(false);
                if (!commentOpen) {
                  const attrs = editor.getAttributes('comment');
                  setTimeout(() => {
                    if (commentInputRef.current && attrs.commentText) {
                      commentInputRef.current.value = attrs.commentText;
                    } else if (commentInputRef.current) {
                      commentInputRef.current.value = '';
                    }
                  }, 0);
                }
              }}
            >
              <MessageSquare size={14} />
            </ToolbarButton>
            {commentOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setCommentOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-popover p-2 shadow-lg">
                  <label htmlFor="textblock-comment-input" className="text-xs font-medium text-muted-foreground">
                    Comment text
                  </label>
                  <textarea
                    id="textblock-comment-input"
                    ref={commentInputRef}
                    placeholder="Add a note…"
                    rows={3}
                    className="mt-1 w-full resize-y rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setCommentOpen(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
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
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
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

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Undo / Redo */}
          <ToolbarButton
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Wrapper captures mouse move/leave so we can show the comment tooltip when hovering over comment spans. */}
      <div
        ref={editorWrapRef}
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={handleEditorMouseLeave}
        className="relative"
      >
        <EditorContent
          editor={editor}
          className={cn(
            'px-4 py-3 text-sm text-foreground',
            !isEditing && 'cursor-default select-text',
          )}
        />
      </div>

      {/* Comment tooltip is portaled to document.body so it isn't clipped by overflow and stays above other content. */}
      {commentTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
            style={{ left: commentTooltip.left, top: commentTooltip.top }}
            role="tooltip"
            aria-live="polite"
          >
            {commentTooltip.text}
          </div>,
          document.body,
        )}
    </div>
  );
}
