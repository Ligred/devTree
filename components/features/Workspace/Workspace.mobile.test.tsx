/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Workspace } from './Workspace';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/settingsStore', () => ({
  useSettingsStore: () => true,
}));

vi.mock('@/lib/usePageTracking', () => ({
  usePageTracking: () => undefined,
}));

vi.mock('@/lib/hooks/useWritingTracking', () => ({
  useWritingTracking: () => undefined,
}));

vi.mock('./buildTreeData', () => ({
  buildTreeDataWithActions: () => [],
}));

vi.mock('./treeUtils', () => ({
  findFirstPageIdInSubtree: () => null,
  findNodeInRoot: () => null,
  getAncestorPath: () => [],
}));

vi.mock('@/components/features/FileExplorer/FileExplorer', () => ({
  FileExplorer: () => <div data-testid="file-explorer" />,
}));

// capture transition prop passed down to the sidebar so we can assert mobile
// animation matches desktop (0.34s)
let capturedSidebarTransition: any = null;
vi.mock('@/components/shared/Sidebar', () => ({
  Sidebar: ({ transition, children, visible, mobileOverlay }: any) => {
    capturedSidebarTransition = transition;
    const isOpen = visible || mobileOverlay?.open;
    if (!isOpen) return null;
    // mimic minimal structure; do not forward unknown props to DOM
    return <aside data-testid="sidebar-stub">{children}</aside>;
  },
}));

vi.mock('@/components/features/MainContent', () => ({
  MainContent: ({ onMobileSidebarToggle }: { onMobileSidebarToggle?: () => void }) => (
    <button type="button" data-testid="toggle-mobile-sidebar" onClick={onMobileSidebarToggle}>
      Toggle mobile sidebar
    </button>
  ),
}));

vi.mock('./hooks/useWorkspaceData', () => ({
  useWorkspaceData: () => ({
    loading: false,
    pages: [
      {
        id: 'p1',
        title: 'Page 1',
        tags: [],
        content: null,
        blocks: [],
        folderId: null,
      },
    ],
    setPages: vi.fn(),
    treeRoot: { id: 'root', name: 'Root', children: [] },
    setTreeRoot: vi.fn(),
    treeRootRef: { current: { id: 'root', name: 'Root', children: [] } },
    dbFolderIds: new Set<string>(),
    serverBlocksRef: { current: {} },
    serverPagesRef: { current: {} },
  }),
}));

vi.mock('./hooks/useTreeOperations', () => ({
  useTreeOperations: () => ({
    createFile: vi.fn(),
    createFolder: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleDocumentDrag: vi.fn(),
    handleRenameFolder: vi.fn(),
    editingFolderId: null,
    setEditingFolderId: vi.fn(),
    deleteDialog: null,
    setDeleteDialog: vi.fn(),
    handleConfirmDelete: vi.fn(),
  }),
}));

vi.mock('./hooks/useSaveLogic', () => ({
  useSaveLogic: () => ({
    setTitleHasError: vi.fn(),
    cancelTitleBlurSave: vi.fn(),
    justCreatedPageRef: { current: false },
    setIsEditMode: vi.fn(),
    isEditMode: false,
    isDirty: false,
    setPendingNavId: vi.fn(),
    pendingNavId: null,
    handleSave: vi.fn(),
    saveFeedback: false,
    handleTitleChange: vi.fn(),
    handleTitleBlur: vi.fn(),
    titleHasError: false,
    handleTagsChange: vi.fn(),
    handleEditModeChange: vi.fn(),
    handleContentChange: vi.fn(),
    handleSaveAndLeave: vi.fn(),
    handleLeaveWithout: vi.fn(),
    handleCancelPendingNav: vi.fn(),
  }),
}));

function setMobileViewportMatchMedia() {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      const isDesktopQuery = query.includes('min-width: 768px');
      return {
        matches: !isDesktopQuery,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    },
  });
}

describe('Workspace mobile behavior', () => {
  beforeEach(() => {
    pushMock.mockReset();
    document.body.style.overflow = '';
    setMobileViewportMatchMedia();
  });

  it('opens and closes mobile sidebar, locks body scroll, and closes on Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workspace initialRoutePageId="p1" />);

    expect(container.querySelector('aside')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('toggle-mobile-sidebar'));

    await waitFor(() => expect(container.querySelector('aside')).toBeInTheDocument());
    expect(document.body.style.overflow).toBe('hidden');

    // mobile drawer is rendered (mocked component)
    expect(screen.getByTestId('sidebar-stub')).toBeInTheDocument();

    // the transition prop should match desktop timing (0.34) or be
    // minimal if reduced motion is active (0.01).
    expect(capturedSidebarTransition).not.toBeNull();
    expect([0.34, 0.01]).toContain(capturedSidebarTransition.duration);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(container.querySelector('aside')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('');
  });
});
