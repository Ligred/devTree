Use the `reviewer` agent to review the following code or changes:

$ARGUMENTS

If no argument is given, review all uncommitted changes (`git diff`).

The reviewer will check:
- Correctness (logic, async handling, unhandled rejections)
- Security (auth on every API route, no exposed secrets)
- devTree conventions (@/ imports, requireAuth, CSS variables, Tiptap block patterns)
- TypeScript strictness (no untyped any, type vs interface)
- Over-engineering (unnecessary abstractions, impossible error handling)

Output a structured report with severity levels (critical / warning / suggestion).
