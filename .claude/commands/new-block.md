Create a new Tiptap node extension block for the editor.

Arguments: $ARGUMENTS (block name in PascalCase, e.g. "PdfViewerNode")

## Steps

1. Create `components/features/editor/extensions/$ARGUMENTS.tsx` following this pattern:

```tsx
'use client';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { /* icon */ } from 'lucide-react';

import { BlockHeader } from '../BlockHeader';
import { BlockTagChips } from '../BlockTagChips';
import { useEditable } from '../EditableContext';
import { BLOCK_ATOM_SPEC, BLOCK_NODE_WRAPPER_CLASS, blockStopEvent } from './nodeUtils';

function <BlockName>View({ node, updateAttributes }: ReactNodeViewProps) {
  const { /* attrs */ } = node.attrs as { /* types */ };
  const isEditable = useEditable();

  return (
    <NodeViewWrapper className={BLOCK_NODE_WRAPPER_CLASS}>
      <BlockHeader icon={<Icon size={13} className="text-muted-foreground" />} title="<Label>" />
      <BlockTagChips
        tags={tags ?? []}
        isEditable={isEditable}
        onChange={(t) => updateAttributes({ tags: t })}
        showEmpty={isEditable}
      />
      {/* block content */}
    </NodeViewWrapper>
  );
}

export const <BlockName> = Node.create({
  name: '<block-name>',
  group: 'block',
  atom: true,
  ...BLOCK_ATOM_SPEC,

  addAttributes() {
    return {
      /* attrs with defaults */
      tags: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="<block-name>"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': '<block-name>' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(<BlockName>View);
  },
});
```

2. Register the extension in `components/features/editor/PageEditor.tsx` — add it to the `extensions` array.

3. Add a slash command entry in `components/features/editor/extensions/SlashCommand.tsx` — add an item with `title`, `description`, and `command` that inserts the node.

4. Export the new node from the extensions directory if an index file exists.
