import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { DiagramBlock } from '@/components/MainContent';
import type { DiagramBlockContent } from '@/components/MainContent';

const meta: Meta<typeof DiagramBlock> = {
  title: 'Components/DiagramBlock',
  component: DiagramBlock,
  parameters: { layout: 'padded' },
  argTypes: {
    onChange: { action: 'change' },
    isEditing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof DiagramBlock>;

const emptyContent: DiagramBlockContent = { code: '' };

/** View mode — read-only canvas. */
export const ViewMode: Story = {
  args: { content: emptyContent, onChange: fn(), isEditing: false },
};

/** Edit mode — full Excalidraw toolbar with shapes, arrows, text, freehand, and Mermaid insert. */
export const EditMode: Story = {
  args: { content: emptyContent, onChange: fn(), isEditing: true },
};


const flowchartContent: DiagramBlockContent = {
  code: `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No  --> D[Debug]
    D --> B`,
};

const sequenceContent: DiagramBlockContent = {
  code: `sequenceDiagram
    participant Browser
    participant Server
    participant DB

    Browser->>Server: GET /api/user
    Server->>DB: SELECT * FROM users
    DB-->>Server: rows
    Server-->>Browser: JSON response`,
};

const classDiagramContent: DiagramBlockContent = {
  code: `classDiagram
    class User {
        +String id
        +String email
        +String name
        +login() bool
    }
    class Post {
        +String id
        +String title
        +String content
        +publish() void
    }
    User "1" --> "many" Post : creates`,
};

const erContent: DiagramBlockContent = {
  code: `erDiagram
    USER {
        string id PK
        string email
        string name
    }
    PAGE {
        string id PK
        string title
        string userId FK
    }
    BLOCK {
        string id PK
        string type
        string pageId FK
    }
    USER ||--o{ PAGE : owns
    PAGE ||--o{ BLOCK : contains`,
};

export const Flowchart: Story = {
  args: { content: flowchartContent, onChange: fn() },
};

export const SequenceDiagram: Story = {
  args: { content: sequenceContent, onChange: fn() },
};

export const ClassDiagram: Story = {
  args: { content: classDiagramContent, onChange: fn() },
};

export const EntityRelationship: Story = {
  args: { content: erContent, onChange: fn() },
};

export const Empty: Story = {
  args: { content: { code: '' }, onChange: fn() },
};
