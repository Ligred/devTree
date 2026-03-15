Use the `refactorer` agent to clean up the following file(s) or area:

$ARGUMENTS

The refactorer will:

- Read all files in scope first
- Improve code quality WITHOUT changing behavior
- Always try to use shared (reusable) components
- If we don't have reusable component, create it
- Each component should be in own folder with tests and stories
- Fix: relative imports → @/ aliases, any → proper types, hardcoded colors → CSS vars, dead code, duplication (3+ uses only)
- Run `npx tsc --noEmit`, `pnpm lint`, and `pnpm test` to confirm nothing broke
- Update documentation

Constraints:

- No behavior changes
- No new comments or docstrings
- No renaming for aesthetics only
- No extracting helpers for one-off uses
