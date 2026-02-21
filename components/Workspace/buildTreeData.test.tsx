/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';

import { buildTreeDataWithActions } from './buildTreeData';
import type { TreeRoot } from './treeTypes';
import { ROOT_ID } from './treeTypes';

const t = (key: string) => key;

describe('buildTreeDataWithActions sorting', () => {
  it('sorts folders first and then files alphabetically at root and nested levels', () => {
    const root: TreeRoot = {
      id: ROOT_ID,
      name: 'My workspace',
      children: [
        { id: 'file-z', name: 'zeta.md', pageId: 'file-z' },
        {
          id: 'folder-b',
          name: 'Bravo',
          children: [
            { id: 'b-file-z', name: 'z-last.md', pageId: 'b-file-z' },
            { id: 'b-folder-a', name: 'alpha-folder', children: [] },
            { id: 'b-file-a', name: 'a-first.md', pageId: 'b-file-a' },
          ],
        },
        { id: 'file-a', name: 'alpha.md', pageId: 'file-a' },
        { id: 'folder-a', name: 'Alpha', children: [] },
      ],
    };

    const data = buildTreeDataWithActions({
      root,
      onCreateFile: vi.fn(),
      onCreateFolder: vi.fn(),
      onDelete: vi.fn(),
      selectedPageId: null,
      ancestorPathIds: [],
      t,
    });

    expect(data.map((node) => node.name)).toEqual(['Alpha', 'Bravo', 'alpha.md', 'zeta.md']);

    const bravoChildren = data.find((node) => node.id === 'folder-b')?.children;
    expect(bravoChildren?.map((node) => node.name)).toEqual([
      'alpha-folder',
      'a-first.md',
      'z-last.md',
    ]);
  });
});
