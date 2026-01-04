"use client"
import { TreeView, TreeDataItem } from "@/app/ui/components/ui/tree-view"

import {
  FileCode,
  Folder
} from 'lucide-react';

const sampleData: TreeDataItem[] = [
  { id: "1", name: "Frontend Development", children: [
    { id: "2", name: "React Hooks", children: [
      { id: "3", name: "useState.js" },
      { id: "4", name: "useEffect.js" }
    ]}
  ]}
]

type FileExplorerProps = Readonly<{
  onSelect: (item: TreeDataItem | undefined) => void;
}>;

export function FileExplorer({ onSelect }: FileExplorerProps) {
  return (
    <div className="w-64 border-r bg-background">
      <TreeView data={sampleData} onSelectChange={onSelect} defaultNodeIcon={Folder} defaultLeafIcon={FileCode}/>
    </div>
  )
}
