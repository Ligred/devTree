Scaffold a new Next.js API route handler for this project.

Arguments: $ARGUMENTS (resource path, e.g. "diary/journals/[journalId]/entries")

## Steps

1. Create `app/api/$ARGUMENTS/route.ts` following this pattern:

- Always call requireAuth(req) first; return auth.error immediately if present
- Parse req.json() in try/catch, return 400 on failure
- Validate field types manually (typeof checks), no Zod
- Log errors: console.error('[METHOD /api/path]', err)
- Return NextResponse.json(result) or NextResponse.json(result, { status: 201 }) for POST
- Duplicate name conflict: { error: 'Name already exists', code: 'DUPLICATE_NAME' } status 409
- Non-fatal analytics: void prisma.contentEvent.create({...}).catch(() => {})

2. If a Prisma model is missing, add it to prisma/schema.prisma then run: pnpm db:migrate

3. Check existing route handlers in app/api/ for patterns before writing new ones.
