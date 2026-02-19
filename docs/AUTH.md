# DevTree — Authentication

How authentication works: NextAuth, credentials vs OAuth, session, middleware, and user profile APIs.

---

## 1. Overview

- **Protected routes:** All routes except `/login`, `/register`, `/forgot-password`, and `/api/auth/*` require a valid session. Middleware runs first: no token → redirect to login (pages) or 401 JSON (API).
- **Session:** Stored in an HTTP-only cookie as a JWT (no server-side session table). Session callback merges fresh `name` and `image` from the DB so profile updates show without re-login.
- **Providers:** Credentials (email + password, scrypt), Google OAuth, GitHub OAuth. Registration is custom (`/api/auth/register`); then user signs in via credentials.

---

## 2. NextAuth configuration

**File:** `app/api/auth/[...nextauth]/route.ts`

- **Adapter:** `PrismaAdapter(prisma)` — creates/updates User and Account for OAuth.
- **Session:** `strategy: 'jwt'`, `maxAge: 30 days`.
- **Callbacks:** `session` — loads `User.name` and `User.image` from DB by `token.sub` and merges into `session.user`.
- **Error handling:** Route wrapper returns JSON on 500 so the client never gets HTML.

---

## 3. Credentials and registration

- **Credentials authorize:** Look up User by email, verify password with `verifyPassword` (scrypt), return user payload.
- **Registration:** `POST /api/auth/register` — validate email and password strength, hash with `hashPassword`, create User. Front-end then signs in via credentials.

---

## 4. OAuth (Google, GitHub)

Callback URLs: `{NEXTAUTH_URL}/api/auth/callback/google` and `/github`. PrismaAdapter creates/updates User and Account. OAuth users have `password: null`; can set password later in Settings.

---

## 5. Middleware

**File:** `middleware.ts`

- **Matcher:** All paths except `_next`, `api/auth`, favicon, static assets.
- **No token:** For `pathname.startsWith('/api/')` return 401 JSON; otherwise redirect to `/login?callbackUrl=...`.

---

## 6. User profile APIs

- **PATCH /api/user/profile** — Body: `{ name?, image? }`. Updates current user in DB.
- **POST /api/user/avatar** — Multipart file; saves to `public/uploads/avatars/<userId>.<ext>`, sets `User.image`, returns `{ url }`.
- **PATCH /api/user/password** — Body: `{ currentPassword, newPassword }`. Verifies current, validates new (same rules as registration), hashes and updates.
- **GET /api/user/preferences** — Returns the current user’s saved preferences (theme, locale, tagsPerPageEnabled, tagsPerBlockEnabled). Stored in `User.preferences` (JSON).
- **PATCH /api/user/preferences** — Body: `{ theme?, locale?, tagsPerPageEnabled?, tagsPerBlockEnabled? }`. Merges into stored preferences so settings follow the user across devices.

All require authenticated user (middleware + getToken in handler).

---

## 7. Default admin

In `prisma/seed.ts`: when `ADMIN_PASSWORD` is set, upserts user with `ADMIN_EMAIL` (default `admin@localhost`) and hashed password. Run `pnpm db:seed` after setting env. See [SETUP.md](./SETUP.md) and main README for env table.
