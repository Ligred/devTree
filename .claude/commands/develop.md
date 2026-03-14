Use the `developer` agent to implement the following task:

$ARGUMENTS

The developer will:

- Read CLAUDE.md and all relevant files before making changes
- Implement the minimal change needed — no extra features or refactoring beyond scope
- Follow all devTree conventions (@/ imports, requireAuth, Tailwind CSS vars, etc.)
- Run `npx tsc --noEmit`, `pnpm run lint`, `pnpm run format` and 'pnpm run knip' after implementation

If a plan exists in the conversation, follow it. Otherwise explore the codebase first to understand the context.
