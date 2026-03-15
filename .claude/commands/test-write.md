Use the `test-writer` agent to write unit tests for the following file(s) or feature:

$ARGUMENTS

The test-writer will:

1. Read the source file(s) in full before writing anything
2. Find existing tests to match style and conventions
3. Cover: happy path, null/undefined inputs, error states, edge cases
4. Place test files next to source: `foo.ts` → `foo.test.ts`
5. Run `pnpm test:unit` to confirm all new tests pass
6. Never modify source files — only create or edit test files

Report: files created, number of test cases, any gaps in coverage.
