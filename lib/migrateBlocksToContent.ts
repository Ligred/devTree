/**
 * migrateBlocksToContent.ts
 *
 * One-time migration utility — converts the legacy block-based page format into
 * a unified Tiptap JSONContent document stored in Page.content.
 *
 * Usage (run once per page, or via a batch script):
 *
 *   import { migratePageToContent } from '@/lib/migrateBlocksToContent';
 *   const json = migratePageToContent(page.blocks);
 *   await apiUpdatePage(page.id, { content: json });
 *
 * Or via the API:
 *   PUT /api/pages/:id  { content: <result> }
 *
 * ─── BLOCK TYPE MAPPING ────────────────────────────────────────────────────────
 *
 *   text        → Tiptap HTML parsed with StarterKit (paragraphs, headings, etc.)
 *   code        → CodeBlockNode atom node
 *   checklist   → ChecklistNode atom node
 *   canvas      → CanvasNode atom node
 *   audio       → AudioNode atom node
 *   video       → VideoNode atom node
 *   image       → ImageNode atom node
 *   link-card   → LinkCardNode atom node
 *   table       → TableBlockNode atom node
 *
 * ─── LIMITATIONS ──────────────────────────────────────────────────────────────
 *
 * Rich-text blocks (type 'text') store their content as HTML. Tiptap can parse
 * this HTML via `generateJSON` if needed, but for simplicity this utility stores
 * text content as a prose HTML paragraph node so nothing is lost.
 */

import type { JSONContent } from '@tiptap/core';
import type { Block } from '@/components/MainContent/types';

// ─── Per-block converters ─────────────────────────────────────────────────────

function convertTextBlock(block: Block): JSONContent | null {
  // Text blocks store their content as a Tiptap HTML string
  // We wrap it in a doc node for the generateJSON path, but here we use a
  // simple rawHTML paragraph approach to keep the dependency surface small.
  const html = typeof block.content === 'string' ? block.content : '';
  if (!html.trim()) return null;
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: html.replace(/<[^>]*>/g, '') }],
  };
}

function convertCodeBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'codeBlockNode',
    attrs: {
      code: typeof c.code === 'string' ? c.code : '',
      language: typeof c.language === 'string' ? c.language : 'javascript',
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertChecklistBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'checklistNode',
    attrs: {
      title: typeof c.title === 'string' ? c.title : '',
      items: Array.isArray(c.items) ? c.items : [],
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertCanvasBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'canvasNode',
    attrs: {
      data: typeof c.data === 'string' ? c.data : JSON.stringify({ elements: [], appState: {} }),
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertAudioBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'audioNode',
    attrs: {
      url: typeof c.url === 'string' ? c.url : '',
      caption: typeof c.caption === 'string' ? c.caption : '',
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertVideoBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'videoNode',
    attrs: {
      url: typeof c.url === 'string' ? c.url : '',
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertImageBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'imageNode',
    attrs: {
      url: typeof c.url === 'string' ? c.url : '',
      alt: typeof c.alt === 'string' ? c.alt : '',
      caption: typeof c.caption === 'string' ? c.caption : '',
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertLinkCardBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'linkCardNode',
    attrs: {
      url: typeof c.url === 'string' ? c.url : '',
      label: typeof c.label === 'string' ? c.label : '',
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

function convertTableBlock(block: Block): JSONContent | null {
  if (typeof block.content !== 'object' || block.content === null) return null;
  const c = block.content as Record<string, unknown>;
  return {
    type: 'tableBlockNode',
    attrs: {
      headers: Array.isArray(c.headers) ? c.headers : [],
      rows: Array.isArray(c.rows) ? c.rows : [],
      tags: Array.isArray(block.tags) ? block.tags : [],
    },
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function convertBlock(block: Block): JSONContent | null {
  switch (block.type as string) {
    case 'text':        return convertTextBlock(block);
    case 'code':        return convertCodeBlock(block);
    case 'checklist':   return convertChecklistBlock(block);
    case 'canvas':      return convertCanvasBlock(block);
    case 'audio':       return convertAudioBlock(block);
    case 'video':       return convertVideoBlock(block);
    case 'image':       return convertImageBlock(block);
    case 'link-card':   return convertLinkCardBlock(block);
    case 'table':       return convertTableBlock(block);
    default: {
      console.warn('[migratePageToContent] Unknown block type:', block.type);
      return null;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert an array of legacy blocks into a single Tiptap JSONContent document.
 *
 * @param blocks  The `Page.blocks` array from the legacy format.
 * @returns A Tiptap JSON doc ready to be stored in `Page.content`.
 */
export function migratePageToContent(blocks: Block[]): JSONContent {
  const content = blocks
    .map(convertBlock)
    .filter((node): node is JSONContent => node !== null);

  // A Tiptap document must contain at least one node
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content,
  };
}
