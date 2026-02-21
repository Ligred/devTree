'use client';

import { TreeView, type TreeDataItem } from '@/components/ui/tree-view';
import { FileCode, Folder } from 'lucide-react';

type TreeRenderItemParams = {
  item: TreeDataItem;
  level: number;
  isLeaf: boolean;
  isSelected: boolean;
  isOpen?: boolean;
  hasChildren: boolean;
};

type FileExplorerProps = Readonly<{
  data: TreeDataItem[];
  onSelect: (item: TreeDataItem | undefined) => void;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  selectedItemId?: string;
  expandedItemIds?: string[];
  rootDropLabel?: string;
}>;

export function FileExplorer({
  data,
  onSelect,
  onDocumentDrag,
  renderItem,
  selectedItemId,
  expandedItemIds,
  rootDropLabel,
}: FileExplorerProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <TreeView
        data={data}
        onSelectChange={onSelect}
        onDocumentDrag={onDocumentDrag}
        renderItem={renderItem}
        selectedItemId={selectedItemId}
        expandedItemIds={expandedItemIds}
        rootDropLabel={rootDropLabel}
        defaultNodeIcon={Folder}
        defaultLeafIcon={FileCode}
      />
    </div>
  );
}
