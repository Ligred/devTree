# DevTree — Learning Workspace

A **personal knowledge base** built as a learning project to explore modern full-stack web development. Create structured notes with rich text, code snippets, tables, checklists, images, and diagrams — all in a drag-and-drop block editor.

> **Learning goal:** Understand how a real production-grade React application is architected, tested, and deployed — with source code that is intentionally over-commented for educational purposes.

---

## Features

| Feature | Description |
|---------|-------------|
| 📝 **Block editor** | 8 block types: Text (rich text), Code (Monaco), Table, Checklist, Link, Image, Diagram, Whiteboard |
| 🗂️ **File explorer** | Sidebar tree with folders, drag-and-drop reordering, rename, delete |
| 🎨 **Themes** | Light / Dark / System via `next-themes` |
| 🌍 **Internationalisation** | English and Ukrainian; persisted in `localStorage` |
| 📱 **Responsive** | Mobile-first layout with a slide-in sidebar drawer |
| 🔍 **Search** | Filter pages by title or content (Cmd+K) |
| 📊 **Page stats** | Word count, estimated reading time, block count |
| ⬇️ **Export** | Download any page as a Markdown `.md` file |
| ⌨️ **Keyboard shortcuts** | `Cmd+S` save · `Cmd+K` search |
| 🧪 **Testing** | Vitest unit tests · Storybook stories · C# .NET + Playwright E2E |
| 🐳 **Docker** | Full-stack Docker Compose setup with PostgreSQL |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | [Next.js 16](https://nextjs.org) (App Router) | SSR, file routing, standalone Docker output |
| UI library | [React 19](https://react.dev) | Component model, hooks, concurrent features |
| Language | [TypeScript 5](https://typescriptlang.org) | Static types, better refactoring, fewer runtime bugs |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) | Utility-first, no CSS files, dark mode via class |
| Components | [Radix UI](https://radix-ui.com) | Headless accessible primitives (dialogs, menus) |
| Icons | [Lucide React](https://lucide.dev) | Consistent SVG icon set |
| Rich text | [Tiptap 3](https://tiptap.dev) | Headless ProseMirror editor, extensible |
| Code editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) | VS Code engine, syntax highlighting for 40+ languages |
| Diagrams | [Mermaid.js 11](https://mermaid.js.org) | Text-to-diagram: flowcharts, sequence diagrams, ERDs |
| Drag & drop | [@dnd-kit](https://dndkit.com) | Accessible DnD with pointer and keyboard sensors |
| Auth | [NextAuth v5](https://authjs.dev) | GitHub OAuth, session management |
| Database | [PostgreSQL](https://postgresql.org) + [Prisma 6](https://prisma.io) | Type-safe ORM, migrations |
| Unit tests | [Vitest 4](https://vitest.dev) + [Testing Library](https://testing-library.com) | Fast, Jest-compatible, ESM native |
| Component dev | [Storybook 10](https://storybook.js.org) | Isolated component development and visual testing |
| E2E tests | [C# .NET 9 + Playwright](https://playwright.dev) | Cross-browser E2E with Page Object Model |
| Package manager | [pnpm](https://pnpm.io) | Fast, disk-efficient, strict dependency resolution |
| Linting | [ESLint 9](https://eslint.org) (flat config) + SonarJS + jsx-a11y + storybook | Catch bugs, enforce patterns, accessibility |
| Dead-code detection | [knip](https://knip.dev) | Find unused files, exports, and dependencies |
| Formatting | [Prettier 3](https://prettier.io) + import-sort + tailwindcss | Consistent style, auto-sorted imports |
| State management | [Zustand](https://zustand-demo.pmnd.rs) | Minimal global state with `localStorage` persistence |

---

## Prerequisites

- **Node.js 20+** — [download](https://nodejs.org)
- **pnpm** — `npm install -g pnpm`
- **Docker** (optional, for local DB) — [download](https://docker.com)
- **.NET 9 SDK** (optional, for E2E tests) — [download](https://dotnet.microsoft.com)

---

## Quick Start (local, no database)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/devTree.git
cd devTree

# 2. Install dependencies
pnpm install

# 3. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in demo mode with sample pages loaded from `components/Workspace/samplePages.ts`.

---

## Setup with Database

### Option A — Docker (recommended)

```bash
# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Start the full stack (Next.js app + PostgreSQL)
pnpm docker:up

# The app is now available at http://localhost:3000
```

### Option B — Local database only

```bash
# Start only PostgreSQL in Docker
pnpm db:dev

# Copy and configure environment variables
cp .env.example .env.local

# Push schema and seed sample data
pnpm db:push
pnpm db:seed

# Start the dev server
pnpm dev
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/devtree"

# NextAuth — any random string for local dev (use openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# GitHub OAuth app credentials
# Create one at: https://github.com/settings/developers
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

---

## Available Scripts

```bash
# Development
pnpm dev              # Start Next.js dev server with Turbopack
pnpm build            # Create production build
pnpm start            # Serve the production build

# Code quality
pnpm lint             # ESLint — check all source files
pnpm lint:fix         # ESLint — auto-fix fixable issues
pnpm format           # Prettier — format all files
pnpm format:check     # Prettier — verify formatting without writing
pnpm knip             # knip — find unused files, exports, dependencies

# Testing
pnpm test             # Run all Vitest unit tests (once)
pnpm test:unit        # Run unit tests only
pnpm test:watch       # Watch mode — re-runs on file changes

# Storybook (component development)
pnpm storybook        # Start Storybook on http://localhost:6006
pnpm build-storybook  # Build static Storybook site

# Database
pnpm db:dev           # Start Docker PostgreSQL (dev only)
pnpm db:migrate       # Run Prisma migrations (production)
pnpm db:push          # Push schema to DB (dev — no migration history)
pnpm db:seed          # Populate DB with sample data
pnpm db:studio        # Open Prisma Studio (visual DB browser)
pnpm db:reset         # Drop and recreate DB, re-seed

# Docker
pnpm docker:up        # Start full stack (app + DB) with Docker Compose
pnpm docker:down      # Stop and remove all containers
```

---

## Running E2E Tests (C# .NET 9 + Playwright)

```bash
cd tests/e2e

# Install .NET dependencies and Playwright browsers (first time)
dotnet build
pwsh bin/Debug/net9.0/playwright.ps1 install

# Run all tests (app must be running at http://localhost:3000)
dotnet test

# Override base URL
DEVTREE_BASE_URL=http://localhost:3001 dotnet test

# Run in headed (visible browser) mode
dotnet test -- NUnit.DefaultTestNamePattern="{m}{a}" Playwright.LaunchOptions.Headless=false
```

See [`tests/e2e/README.md`](tests/e2e/README.md) for full details.

---

## Project Structure

```
devTree/
├── app/                         # Next.js App Router
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── login/                   # Login page
│   ├── layout.tsx               # Root layout (fonts, providers)
│   ├── page.tsx                 # Entry point → renders <Workspace>
│   ├── globals.css              # Global CSS (Tailwind + Tiptap styles)
│
├── components/
│   ├── FileExplorer/            # Sidebar file tree
│   ├── MainContent/             # Right panel: header, editor, stats
│   │   └── blocks/              # 8 block type components
│   ├── SettingsDialog/          # Theme + language settings modal
│   ├── UserMenu/                # Avatar dropdown menu
│   ├── Workspace/               # App shell (layout + state)
│   │   ├── Workspace.tsx        # Root state container
│   │   ├── buildTreeData.tsx    # Domain model → UI tree adapter
│   │   ├── treeTypes.ts         # TreeRoot / TreeNode types
│   │   ├── treeUtils.ts         # Pure tree manipulation functions
│   │   ├── samplePages.ts       # Demo content
│   │   └── DeleteConfirmDialog.tsx
│   └── ui/                      # shadcn/ui primitives
│
├── lib/
│   ├── i18n.tsx                 # Internationalisation context
│   ├── pageUtils.ts             # Stats, Markdown export
│   ├── prisma.ts                # Prisma client singleton
│   └── utils.ts                 # cn() Tailwind helper
│
├── messages/
│   ├── en.json                  # English translations
│   └── uk.json                  # Ukrainian translations
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Demo data seeder
│
├── stories/                     # Storybook stories
│   └── blocks/                  # Block-specific stories
│
├── tests/
│   └── e2e/                     # C# .NET + Playwright E2E tests
│       ├── PageObjects/         # Page Object Model
│       ├── Setup/               # Base test class
│       └── Tests/               # Test suites
│
├── docs/
│   └── ARCHITECTURE.md          # Architecture deep-dive with diagrams
│
├── Dockerfile                   # Multi-stage production Docker image
├── docker-compose.yml           # Full stack: app + PostgreSQL
├── docker-compose.dev.yml       # Dev: PostgreSQL only
└── .env.example                 # Environment variable template
```

---

## How to Add a New Block Type

Adding a new block type involves 6 steps:

1. **Add the type name** to `BlockType` in `components/MainContent/types.ts`
2. **Define the content shape** — add a `XXXBlockContent` type and add it to the `BlockContent` union
3. **Create the component** — `components/MainContent/blocks/XXXBlock.tsx`
4. **Register in the factory** — add a `case 'xxx':` in `createBlock()` in `BlockEditor.tsx`
5. **Register the renderer** — add a `case 'xxx':` in the `BlockContent` `switch` in `BlockEditor.tsx`
6. **Add to the picker** — add an entry in `BLOCK_DEFS` in `BlockPicker.tsx` with label/description i18n keys

Don't forget to:
- Add i18n keys to `messages/en.json` and `messages/uk.json`
- Write a unit test in `components/MainContent/blocks/XXXBlock.test.tsx`
- Write a Storybook story in `stories/blocks/XXXBlock.stories.tsx`
- Handle the type in `blockToMarkdown()` in `lib/pageUtils.ts`

---

## Architecture Overview

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a deep dive into:
- System architecture diagram
- Component hierarchy
- Data model (Block, Page, TreeRoot)
- State management flow
- Drag-and-drop algorithm
- Tree manipulation (path copying, cycle detection)
- i18n system
- Testing strategy

---

## Contributing

This is a learning project. Contributions, experiments, and questions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with tests
4. Run `pnpm test` to verify
5. Open a pull request

---

## License

MIT
