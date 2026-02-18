/**
 * treeTypes.ts — data structures for the sidebar file explorer tree.
 *
 * ─── WHY A SEPARATE FILE? ─────────────────────────────────────────────────────
 *
 * Type definitions are separated from utility functions (`treeUtils.ts`) so that
 * components can import types without pulling in the entire utility bundle. This
 * is especially important for tree-view UI components that only need the types,
 * not the manipulation logic.
 *
 * ─── NODE DISCRIMINATION ──────────────────────────────────────────────────────
 *
 * A `TreeNode` is either a FILE or a FOLDER based on the presence of fields:
 *
 *   FILE:    pageId is set, children is undefined.
 *   FOLDER:  children is an array (possibly empty), pageId is undefined.
 *
 * WHY use field presence as a discriminant instead of a `kind: 'file' | 'folder'`
 * union type?
 *   Field presence is the conventional JavaScript approach for heterogeneous
 *   tree nodes and matches how shadcn/ui's TreeDataItem works. A union type with
 *   `kind` would be more explicit but requires updating every piece of code that
 *   constructs a node. The `isFolder` / `isFile` helpers centralise the check.
 *
 * ─── RELATIONSHIP WITH THE PAGES ARRAY ────────────────────────────────────────
 *
 * The tree stores ONLY the hierarchy and a reference (`pageId`) to the page.
 * Actual page content (title, blocks) lives in Workspace's `pages` state.
 *
 * Why separate structures?
 *   - A folder can contain many pages; the folder node has no `pageId`.
 *   - Page content can be large; the tree structure should stay small.
 *   - This separation mirrors a file system: the directory tree stores paths,
 *     not file contents.
 *
 * ─── IMPROVEMENT IDEAS ────────────────────────────────────────────────────────
 *   - Add `createdAt: number` to TreeNode for sorting by creation date.
 *   - Add `icon?: string` to folders for custom emoji icons.
 *   - Store tree in a flat Map<id, TreeNode> with parentId references for O(1)
 *     lookups (current approach is O(n) recursive search).
 */

/**
 * A node in the sidebar tree.
 *
 * FILE node:   `{ id, name, pageId }` — leaf node linking to a page.
 * FOLDER node: `{ id, name, children }` — container that can hold files and
 *               other folders (recursive structure).
 *
 * Note: a node CANNOT be both a file and a folder simultaneously.
 */
export type TreeNode = {
  id: string;
  name: string;
  /**
   * Set only on file (page) nodes. Links this tree node to the corresponding
   * entry in Workspace's `pages` array.
   */
  pageId?: string;
  /**
   * Set only on folder nodes. An empty array `[]` means an empty folder (still
   * a folder — `Array.isArray([])` is true). `undefined` means a file.
   */
  children?: TreeNode[];
};

/**
 * The invisible root node of the entire tree.
 *
 * WHY a separate type instead of reusing TreeNode?
 *   TreeRoot always has `children` (non-optional) and never has `pageId`.
 *   Making this explicit at the type level prevents bugs like passing the root
 *   to functions expecting a child TreeNode.
 */
export type TreeRoot = {
  id: string;
  name: string;
  children: TreeNode[]; // always present, unlike TreeNode.children
};

/** Stable id for the root node. Used throughout the tree utilities. */
export const ROOT_ID = 'root';

/**
 * Virtual id used as a drop target for "move to root level".
 *
 * WHY not just use ROOT_ID?
 *   The tree-view UI component uses ids to identify drop targets. ROOT_ID might
 *   conflict with a real node id if someone names a folder 'root'. Using a
 *   reserved sentinel value that starts with `__` avoids this collision.
 */
export const ROOT_DROP_TARGET_ID = '__root_drop__';

/**
 * Type guard: is this node a folder (has an array of children)?
 *
 * The return type `node is TreeNode & { children: TreeNode[] }` narrows the
 * type so TypeScript knows `node.children` is defined after the check.
 */
export function isFolder(node: TreeNode): node is TreeNode & { children: TreeNode[] } {
  return Array.isArray(node.children);
}

/** Type guard: is this node a file (linked to a page)? */
export function isFile(node: TreeNode): boolean {
  return node.pageId != null;
}
