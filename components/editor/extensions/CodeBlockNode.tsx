'use client';

/**
 * CodeBlockNode — Monaco-based code editor as a Tiptap node.
 *
 * Attrs: code (string), language (string), tags (string[])
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useEditable } from '../EditableContext';
import dynamic from 'next/dynamic';
import { Code2 } from 'lucide-react';
import { BlockTagChips } from '../BlockTagChips';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css',
  'json', 'yaml', 'markdown', 'bash', 'plaintext',
];

// ─── Node View Component ──────────────────────────────────────────────────────

function CodeBlockNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const { code, language, tags } = node.attrs as { code: string; language: string; tags: string[] };
  const isEditable = useEditable();

  return (
    <NodeViewWrapper className="my-2 rounded-xl border border-border bg-card overflow-hidden" data-drag-handle>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5">
        <Code2 size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Code</span>
        <div className="flex-1" />
        {isEditable ? (
          <select
            value={language ?? 'javascript'}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        ) : (
          <span className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {language ?? 'javascript'}
          </span>
        )}
      </div>

      {/* Block tags */}
      <BlockTagChips
        tags={tags ?? []}
        isEditable={isEditable}
        onChange={(t) => updateAttributes({ tags: t })}
        showEmpty={isEditable}
      />

      {/* Editor */}
      <div className="min-h-32" onMouseDown={(e) => e.stopPropagation()}>
        <MonacoEditor
          height={Math.max(128, Math.min(600, (code?.split('\n').length ?? 1) * 20 + 32))}
          language={language ?? 'javascript'}
          value={code ?? ''}
          onChange={(val) => isEditable && updateAttributes({ code: val ?? '' })}
          options={{
            readOnly: !isEditable,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            theme: 'vs-dark',
            padding: { top: 8, bottom: 8 },
          }}
          theme="vs-dark"
        />
      </div>
    </NodeViewWrapper>
  );
}

// ─── Node Definition ──────────────────────────────────────────────────────────

export const CodeBlockNode = Node.create({
  name: 'codeBlockNode',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: { default: '' },
      language: { default: 'javascript' },
      tags: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="codeBlockNode"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'codeBlockNode' })];
  },

  addNodeView() {
    // Prevent ProseMirror from intercepting events inside Monaco,
    // but still allow drag events so the GlobalDragHandle works.
    return ReactNodeViewRenderer(CodeBlockNodeView, {
      stopEvent: ({ event }) => !event.type.startsWith('drag'),
    });
  },
});
