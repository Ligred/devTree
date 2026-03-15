Use the `test-runner` agent to run the test suite and fix all failures.

$ARGUMENTS

The test-runner will:

1. Run `pnpm test` and collect all failures
2. Read failing test files AND their source files
3. Fix root causes — in source if it's a real bug, in tests if assertions are wrong
4. Re-run tests after each fix to confirm
5. Run `npx tsc --noEmit` when all tests pass

Rules:

- Never delete or skip a test to make it pass
- Never add @ts-ignore to suppress failures
- Fix the underlying issue

Report every file changed and why.
