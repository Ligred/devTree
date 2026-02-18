'use client';

/**
 * TextBlock — a rich-text editor block powered by Tiptap.
 *
 * ─── WHY TIPTAP? ──────────────────────────────────────────────────────────────
 *
 * Tiptap is a headless rich-text editor built on ProseMirror. "Headless" means
 * it provides all the editing logic (commands, state, serialisation) but zero
 * default styling — you own 100% of the UI. This makes it ideal for design
 * systems where you need the editor to match your component library.
 *
 * Alternatives considered:
 *   - Quill: well-known but ships opinionated styles and is harder to theme.
 *   - Slate: very low-level, requires implementing more logic from scratch.
 *   - ContentEditable div: no undo/redo, clipboard, or keyboard shortcut support.
 *
 * ─── HOW TIPTAP WORKS ─────────────────────────────────────────────────────────
 *
 * Tiptap maintains an internal ProseMirror document model. The `useEditor` hook
 * creates an editor instance bound to a React lifecycle. Extensions add features:
 *   - StarterKit: bold, italic, headings, lists, blockquote, code, undo/redo, etc.
 *   - Placeholder: shows placeholder text when the editor is empty.
 *
 * `editor.getHTML()` serialises the internal model to HTML. We store this HTML
 * string in the block's content and pass it back in as `content` on mount.
 *
 * ─── TOOLBAR DESIGN ───────────────────────────────────────────────────────────
 *
 * ToolbarButton uses `onMouseDown` with `e.preventDefault()` rather than
 * `onClick`. Why? The editor loses focus when you click a button outside it
 * (browser default behaviour). `e.preventDefault()` on `mousedown` stops the
 * focus transfer, so the editor caret stays in place while the formatting
 * command runs. Without this, commands like toggleBold would fail because the
 * editor would no longer have an active selection.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add a "Link" button (Tiptap's @tiptap/extension-link).
 *   - Add image-inline support (@tiptap/extension-image).
 *   - Add collaborative editing via Yjs + @tiptap/extension-collaboration.
 *   - Add a floating toolbar (appears on text selection) using
 *     @tiptap/extension-bubble-menu for a cleaner mobile experience.
 *   - Store Tiptap's JSON output (editor.getJSON()) instead of HTML for easier
 *     schema migration and programmatic manipulation.
 */

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
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
  Minus,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A single toolbar button.
 *
 * Extracted into its own component to DRY up the repetitive button pattern
 * and isolate the `onMouseDown` focus-preservation trick in one place.
 */
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
      /**
       * WHY onMouseDown + preventDefault instead of onClick?
       *   onClick fires after mouseup, by which time the editor has already
       *   lost focus (blur event). preventDefault on mousedown stops the
       *   browser from shifting focus away from the editor before the click
       *   handler runs.
       */
      onMouseDown={(e) => {
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
  /**
   * When false (default) the block is rendered in VIEW mode:
   *   - The toolbar is hidden.
   *   - The Tiptap editor is set to non-editable (cursor: default, no focus ring).
   * When true the block is in EDIT mode with the full formatting toolbar.
   *
   * WHY keep Tiptap alive in view mode instead of swapping to a plain div?
   *   `editor.setEditable(false)` makes Tiptap render a read-only view without
   *   unmounting/remounting the editor. This preserves the document state and
   *   avoids a flash when toggling modes. It also means we don't need two
   *   separate rendering paths for the same content.
   */
  isEditing?: boolean;
}>;

export function TextBlock({ content, onChange, isEditing = false }: TextBlockProps) {
  const editor = useEditor({
    immediatelyRender: false,
    // Start non-editable; updated below when isEditing changes
    editable: isEditing,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: 'Write your notes…' }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      // Only propagate changes when in edit mode to avoid spurious saves
      if (isEditing) onChange(e.getHTML());
    },
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
  });

  /**
   * Sync Tiptap's editable flag whenever the parent toggles the mode.
   *
   * WHY useEffect instead of doing this during render?
   *   Calling setEditable() during render can cause Tiptap to fire onUpdate
   *   synchronously, which calls onChange → setState in a parent (Workspace).
   *   That triggers "Cannot update a component while rendering a different
   *   component". Running in useEffect runs after commit, so the state update
   *   is safe.
   */
  useEffect(() => {
    if (editor && editor.isEditable !== isEditing) editor.setEditable(isEditing);
  }, [editor, isEditing]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Toolbar — only rendered in edit mode */}
      {isEditing && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
          <ToolbarButton
            title="Heading 1 (H1)"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2 (H2)"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3 (H3)"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 size={14} />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-border" />

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
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          'px-4 py-3 text-sm text-foreground',
          // In view mode suppress the text cursor so the block doesn't look
          // interactive and confuse users into trying to type.
          !isEditing && 'cursor-default select-text',
        )}
      />
    </div>
  );
}
