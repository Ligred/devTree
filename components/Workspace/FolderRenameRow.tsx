'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileCode, Folder } from 'lucide-react';

import type { TreeDataItem } from '@/components/ui/tree-view';
import { useI18n } from '@/lib/i18n';

type FolderRenameRowParams = Readonly<{
  item: TreeDataItem;
  isLeaf: boolean;
  isSelected: boolean;
  onRenameFolder: (id: string, name: string) => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
}>;

export function FolderRenameRow({
  item,
  isLeaf,
  isSelected,
  onRenameFolder,
  editingFolderId,
  setEditingFolderId,
}: FolderRenameRowParams) {
  const [editName, setEditName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = !isLeaf && editingFolderId === item.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditName(item.name);
  }, [item.name]);

  const handleCommit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== item.name) {
      onRenameFolder(item.id, trimmed);
    }
    setEditingFolderId(null);
  };

  const { t } = useI18n();
  const Icon = isLeaf ? FileCode : Folder;

  const startEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setEditingFolderId(item.id);
  };

  let nameContent: React.ReactNode;
  if (isLeaf) {
    nameContent = <span className="text-sm truncate flex-1 min-w-0">{item.name}</span>;
  } else if (isEditing) {
    nameContent = (
      <input
        ref={inputRef}
        type="text"
        className="min-w-0 flex-1 rounded border border-primary/30 bg-background px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCommit();
          if (e.key === 'Escape') {
            setEditName(item.name);
            setEditingFolderId(null);
            inputRef.current?.blur();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  } else {
    nameContent = (
      <span
        role="button"
        tabIndex={0}
        className="text-sm truncate flex-1 min-w-0 cursor-text"
        onDoubleClick={startEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') startEdit(e);
        }}
        title={t('tree.renameHint')}
      >
        {item.name}
      </span>
    );
  }

  return (
    <div className="relative flex w-full items-center">
      <Icon className="h-4 w-4 shrink-0 mr-2" />
      {nameContent}
      <div className="absolute right-3 hidden group-hover:block">
        {item.actions}
      </div>
    </div>
  );
}
