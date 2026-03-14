Use the `developer` agent to implement the following task:

$ARGUMENTS

The developer will:

- Read CLAUDE.md and all relevant files before making changes
- Implement the minimal change needed — no extra features or refactoring beyond scope
- Always try to use shared (reusable) components
- If we don't have reusable component, create it
- Each component should be in own folder with tests and stories
- Follow all devTree conventions (@/ imports, requireAuth, Tailwind CSS vars, etc.)
- Run `npx tsc --noEmit`, `pnpm run lint`, `pnpm run format` and 'pnpm run knip' after implementation
- Update documentation

If a plan exists in the conversation, follow it. Otherwise explore the codebase first to understand the context.
