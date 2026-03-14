Use the `qa-runner` agent to test the live app like a manual QA tester.

$ARGUMENTS

The agent will:

1. Check if the app is already running on port 3000 — start `pnpm dev` only if not
2. Walk through all key flows: auth, notebook, editor, diary, statistics, settings
3. Check each page for JS console errors, broken routes, missing elements, crash UI
4. Fix any issues found in the source code
5. Re-run failed checks to confirm fixes
6. Leave any already-running dev server untouched when done
7. Report a pass/fail table for every flow

If you only want to test a specific area, pass it as an argument: `/qa diary` or `/qa editor blocks`
