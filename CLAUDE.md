# DevTree — Claude Code Rules

## Project Overview
Personal knowledge base / learning workspace. Next.js 16 App Router, React 19, TypeScript 5 (strict), Tailwind CSS 4, Tiptap 3 editor with custom block extensions, Prisma 6 + PostgreSQL, Zustand 5, NextAuth v5.

## Key Commands
```
pnpm dev              # start dev server
pnpm build            # production build
pnpm test             # run all Vitest tests
pnpm test:unit        # unit tests only
pnpm lint             # ESLint
pnpm lint:fix         # ESLint auto-fix
pnpm format           # Prettier
pnpm db:dev           # start local Postgres via Docker Compose
pnpm db:migrate       # run Prisma migrations (uses .env.development)
pnpm db:studio        # open Prisma Studio
npx tsc --noEmit      # type-check
```

## Directory Structure
```
app/
  api/              # Next.js Route Handlers (auth, folders, pages, stats, diary, user)
  diary/            # Diary feature pages
  notebook/         # Main SPA shell
  statistics/       # Analytics dashboard
  login/            # Auth UI

components/
  features/
    editor/         # Tiptap editor + extensions (see extensions/)
    FileExplorer/   # Sidebar tree, drag-and-drop
    MainContent/    # Header, title, editor, voice dictation
    SettingsDialog/ # User preferences
    Statistics/     # Charts, heatmap, analytics
    Workspace/      # Root state container
    diary/          # Diary-specific components
  shared/           # ActivityBar, UserMenu, reusable UI

lib/
  stores/           # Zustand stores (settings, recording, stats, UI)
  hooks/            # Custom React hooks
  apiAuth.ts        # requireAuth() helper for route handlers
  prisma.ts         # Prisma client singleton
  i18n.tsx          # i18n context (English / Ukrainian)
  pageUtils.ts      # Word count, reading time, Markdown export

prisma/
  schema.prisma     # Models: User, Folder, Page, Block, Diary, ContentEvent
  migrations/

tests/e2e/          # C# .NET 9 Playwright E2E tests
```

## Code Conventions

### Path aliases
Always use `@/` imports, never relative `../../`:
```ts
import { requireAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
```

### API Route Handlers
Pattern: `app/api/<resource>/[id]/route.ts`
- Always call `requireAuth(req)` first; return `auth.error` if present
- Parse JSON with try/catch; validate types manually (no Zod)
- Log errors with `console.error('[METHOD /api/path]', err)`
- Use `NextResponse.json(..., { status: N })`
- Error code for duplicate names: `{ error: '...', code: 'DUPLICATE_NAME' }` → 409
- Use `void prisma.contentEvent.create(...).catch(() => {})` for non-fatal analytics

### Tiptap Node Extensions
Live in `components/features/editor/extensions/`.
- Import `BLOCK_ATOM_SPEC`, `BLOCK_NODE_WRAPPER_CLASS`, `blockStopEvent` from `./nodeUtils`
- Node view component wraps in `<NodeViewWrapper className={BLOCK_NODE_WRAPPER_CLASS}>`
- Use `<BlockHeader icon={...} title="..." />` and `<BlockTagChips />` for consistent UI
- Use `useEditable()` from `../EditableContext` to check read-only mode
- Register new nodes in `PageEditor.tsx` extensions array
- Add slash command entry in `SlashCommand.tsx`

### TypeScript
- Strict mode; no `any` without comment
- Prefer `type` over `interface` for props
- Server components: no `'use client'`; Client components: `'use client'` at top

### Styling
- Tailwind 4 utility classes only; no custom CSS unless absolutely needed
- `cn()` helper from `@/lib/utils` for conditional classes (`clsx` + `tailwind-merge`)
- Dark mode via CSS variables (`bg-background`, `text-foreground`, `border-border`, etc.)

### State Management
- Server state: fetch directly in Server Components or via SWR-style fetch in client components
- Client state: Zustand stores in `lib/stores/`
- Never use `useState` for data that belongs in a Zustand store

### Testing
- Vitest for unit/component tests, placed next to the file (`*.test.tsx`)
- Use `@testing-library/react`; avoid mocking Prisma — test at the route handler level
- E2E in `tests/e2e/` (C# .NET 9 + Playwright)

## What to Avoid
- Do NOT add error handling for impossible scenarios
- Do NOT create abstractions for one-off cases
- Do NOT use `npm` or `yarn` — always `pnpm`
- Do NOT commit `.env.development` or any secrets

## Current Branch
`diary` — active development on diary/journaling feature.
