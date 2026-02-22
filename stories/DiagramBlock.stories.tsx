import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { DiagramBlock } from '@/components/MainContent';
import type { DiagramBlockContent } from '@/components/MainContent';

const meta: Meta<typeof DiagramBlock> = {
  title: 'Components/DiagramBlock',
  component: DiagramBlock,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Excalidraw-powered canvas block for diagrams, shapes, and freehand drawing. ' +
          'Supports hand-drawn shapes, arrows, text, freehand, images, and native Mermaid insert ' +
          '(click "+" → "Mermaid diagram" in edit mode). Content is serialised as Excalidraw JSON ' +
          'in `content.code`.',
      },
    },
  },
  argTypes: {
    onChange: { action: 'change' },
    isEditing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof DiagramBlock>;

const emptyContent: DiagramBlockContent = { code: '' };

/** View mode — read-only canvas, no toolbar. */
export const ViewMode: Story = {
  args: { content: emptyContent, onChange: fn(), isEditing: false },
};

/** Edit mode — full Excalidraw toolbar with shapes, arrows, text, freehand, and Mermaid insert. */
export const EditMode: Story = {
  args: { content: emptyContent, onChange: fn(), isEditing: true },
};

/**
 * Pre-loaded canvas content (shapes + arrow).
 * Demonstrates that saved Excalidraw JSON is restored correctly on mount.
 */
const withElementsContent: DiagramBlockContent = {
  code: JSON.stringify({
    elements: [
      {
        id: 'rect-1', type: 'rectangle', x: 80, y: 60, width: 200, height: 90,
        strokeColor: '#1e1e2e', backgroundColor: '#e4e4f9', fillStyle: 'solid',
        strokeWidth: 2, roughness: 1, opacity: 100, angle: 0,
        version: 1, versionNonce: 100, isDeleted: false, groupIds: [],
        frameId: null, roundness: { type: 3 },
        boundElements: [{ id: 'arrow-1', type: 'arrow' }, { id: 'text-1', type: 'text' }],
        updated: 1, link: null, locked: false,
      },
      {
        id: 'text-1', type: 'text', x: 100, y: 93, width: 160, height: 25,
        text: 'Architecture overview', fontSize: 16, fontFamily: 1,
        textAlign: 'center', verticalAlign: 'middle', baseline: 18,
        strokeColor: '#1e1e2e', backgroundColor: 'transparent', fillStyle: 'hachure',
        strokeWidth: 1, roughness: 1, opacity: 100, angle: 0,
        version: 1, versionNonce: 101, isDeleted: false, groupIds: [],
        frameId: null, roundness: null, boundElements: [],
        updated: 1, link: null, locked: false, containerId: 'rect-1',
      },
      {
        id: 'rect-2', type: 'rectangle', x: 380, y: 60, width: 160, height: 90,
        strokeColor: '#1e1e2e', backgroundColor: '#d4edda', fillStyle: 'solid',
        strokeWidth: 2, roughness: 1, opacity: 100, angle: 0,
        version: 1, versionNonce: 200, isDeleted: false, groupIds: [],
        frameId: null, roundness: { type: 3 },
        boundElements: [{ id: 'arrow-1', type: 'arrow' }, { id: 'text-2', type: 'text' }],
        updated: 1, link: null, locked: false,
      },
      {
        id: 'text-2', type: 'text', x: 400, y: 93, width: 120, height: 25,
        text: 'Database', fontSize: 16, fontFamily: 1,
        textAlign: 'center', verticalAlign: 'middle', baseline: 18,
        strokeColor: '#1e1e2e', backgroundColor: 'transparent', fillStyle: 'hachure',
        strokeWidth: 1, roughness: 1, opacity: 100, angle: 0,
        version: 1, versionNonce: 201, isDeleted: false, groupIds: [],
        frameId: null, roundness: null, boundElements: [],
        updated: 1, link: null, locked: false, containerId: 'rect-2',
      },
      {
        id: 'arrow-1', type: 'arrow', x: 280, y: 105, width: 100, height: 0,
        strokeColor: '#1e1e2e', backgroundColor: 'transparent', fillStyle: 'hachure',
        strokeWidth: 2, roughness: 1, opacity: 100, angle: 0,
        version: 1, versionNonce: 300, isDeleted: false, groupIds: [],
        frameId: null, roundness: { type: 2 }, boundElements: [],
        updated: 1, link: null, locked: false,
        startBinding: { elementId: 'rect-1', focus: 0, gap: 0 },
        endBinding: { elementId: 'rect-2', focus: 0, gap: 0 },
        lastCommittedPoint: null, startArrowhead: null, endArrowhead: 'arrow',
        points: [[0, 0], [100, 0]],
      },
    ],
    appState: { viewBackgroundColor: '#ffffff' },
  }),
};

/** Canvas with pre-loaded elements — shows persistence and rendering from stored JSON. */
export const WithSavedContent: Story = {
  args: { content: withElementsContent, onChange: fn(), isEditing: false },
};

/** Edit mode with pre-loaded content — toolbar visible alongside existing elements. */
export const EditModeWithContent: Story = {
  args: { content: withElementsContent, onChange: fn(), isEditing: true },
};

/** Empty canvas — minimal initial state, no content, no editing. */
export const Empty: Story = {
  args: { content: { code: '' }, onChange: fn() },
};
