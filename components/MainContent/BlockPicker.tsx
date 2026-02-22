'use client';

import * as Popover from '@radix-ui/react-popover';
import { AlignLeft, Code2, Link, Table2, ListChecks, Image as ImageIcon, Music, PenTool, Plus, Video } from 'lucide-react';

import { useI18n } from '@/lib/i18n';
import type { BlockType } from './types';

type BlockDef = {
  type: BlockType;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
};

const BLOCK_DEFS: BlockDef[] = [
  { type: 'text',    labelKey: 'block.text.label',      descriptionKey: 'block.text.description',      icon: <AlignLeft size={18} /> },
  { type: 'code',    labelKey: 'block.code.label',      descriptionKey: 'block.code.description',      icon: <Code2 size={18} /> },
  { type: 'table',   labelKey: 'block.table.label',     descriptionKey: 'block.table.description',     icon: <Table2 size={18} /> },
  { type: 'link',    labelKey: 'block.link.label',      descriptionKey: 'block.link.description',      icon: <Link size={18} /> },
  { type: 'agenda',  labelKey: 'block.checklist.label', descriptionKey: 'block.checklist.description', icon: <ListChecks size={18} /> },
  { type: 'image',   labelKey: 'block.image.label',     descriptionKey: 'block.image.description',     icon: <ImageIcon size={18} aria-hidden /> },
  { type: 'diagram', labelKey: 'block.diagram.label',   descriptionKey: 'block.diagram.description',   icon: <PenTool size={18} /> },
  { type: 'video',   labelKey: 'block.video.label',     descriptionKey: 'block.video.description',     icon: <Video size={18} /> },
  { type: 'audio',   labelKey: 'block.audio.label',     descriptionKey: 'block.audio.description',     icon: <Music size={18} /> },
];

const I18N_ADD_BLOCK = 'block.addBlock';

type BlockPickerProps = Readonly<{
  onSelect: (type: BlockType) => void;
  /** Render as a small "+" trigger if true (used inline between blocks) */
  compact?: boolean;
}>;

export function BlockPicker({ onSelect, compact = false }: BlockPickerProps) {
  const { t } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {compact ? (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
            aria-label={t(I18N_ADD_BLOCK)}
          >
            <Plus size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
            aria-label={t(I18N_ADD_BLOCK)}
          >
            <Plus size={16} />
            {t(I18N_ADD_BLOCK)}
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 w-72 rounded-xl border border-border bg-card p-2 shadow-xl"
        >
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t(I18N_ADD_BLOCK)}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_DEFS.map(({ type, labelKey, descriptionKey, icon }) => (
              <Popover.Close key={type} asChild>
                <button
                  type="button"
                  data-testid={`block-picker-option-${type}`}
                  className="flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => onSelect(type)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="text-muted-foreground">{icon}</span>
                    {t(labelKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t(descriptionKey)}</span>
                </button>
              </Popover.Close>
            ))}
          </div>
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
