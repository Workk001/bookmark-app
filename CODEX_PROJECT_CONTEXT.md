# CODEX_PROJECT_CONTEXT.md — Full Project Understanding

> Read this file completely before writing a single line of code.
> This is the source of truth for what this app is, how it works, and why decisions were made.

---

## What This App Is

A personal bookmarks manager called "Bookmarks App".
Think of it as a tiny version of Linktree + Pocket combined.

- Users sign up with email, password, and a unique @handle
- They save bookmarks (title + URL) — each can be public or private
- Every user gets a public profile at `/<handle>` that anyone can visit
- The dashboard is private — only the logged-in user sees their own bookmarks

---

## The Three Things That Must Never Break

### 1. Privacy
One user must NEVER see another user's bookmarks.
Not through the UI. Not through the API. Not through direct database calls.
This is enforced at the DATABASE level using Row Level Security (RLS) — not just in the frontend.

### 2. Handle Uniqueness
Two users cannot have the same @handle.
Enforced by a `UNIQUE` constraint on the `profiles.handle` column in the database.
Also check on the frontend before signup to give a good error message.

### 3. Auth Protection
The `/dashboard` route must be unreachable without a valid session.
This is enforced in `src/middleware.ts` which runs on every request before the page loads.

---

## How Users Flow Through The App

```
New user:
  Visit / → redirected to /login → click "Sign up" → /signup
  Fill email + password + handle → submit
  Profile row created in DB → welcome email sent → redirected to /dashboard

Returning user:
  Visit / → redirected to /login
  Enter email + password → redirected to /dashboard

Logged-in user:
  /dashboard → see all bookmarks (public + private)
  Add / edit / delete bookmarks
  Click "View public profile" → /<handle> opens in new tab

Logged-out visitor:
  Visit /<handle> → sees only public bookmarks, no login required
  Visit /dashboard → middleware redirects to /login
```

---

## Database Schema

### Table: `profiles`
Stores the user's public handle. One row per user.

```
id          uuid    PRIMARY KEY (references auth.users.id)
handle      text    UNIQUE NOT NULL
created_at  timestamptz
```

### Table: `bookmarks`
Stores all bookmarks. Each row belongs to one user.

```
id          uuid    PRIMARY KEY (auto-generated)
user_id     uuid    NOT NULL (references auth.users.id)
title       text    NOT NULL
url         text    NOT NULL
is_public   boolean DEFAULT false
created_at  timestamptz
```

### Why Two Tables?
- `auth.users` is managed by Supabase Auth — you don't touch it directly
- `profiles` extends auth.users with app-specific data (the @handle)
- `bookmarks` is the core data table

---

## Row Level Security (RLS) Policies

RLS is like a firewall inside the database. Every query passes through it.

### On `bookmarks`:
```sql
-- Owners can do everything with their own bookmarks
policy: auth.uid() = user_id   → allows SELECT, INSERT, UPDATE, DELETE

-- Anyone (even not logged in) can read public bookmarks
policy: is_public = true       → allows SELECT only
```

### On `profiles`:
```sql
-- Anyone can read profiles (needed for /@handle page to work)
policy: true                   → allows SELECT

-- Users can only write their own profile
policy: auth.uid() = id        → allows INSERT, UPDATE
```

### What This Means In Practice
If user A tries to delete user B's bookmark:
- The API route checks `auth.uid()` first → returns 401 if no session
- Even if they bypass the API and call Supabase directly → RLS sees `user_id ≠ auth.uid()` → returns empty result, not an error
- The data is invisible, not just blocked

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        → Supabase project URL (safe for browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Supabase anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY       → Supabase service role (SERVER ONLY — never expose)
MAILERSEND_API_KEY              → MailerSend email API key (SERVER ONLY)
MAILERSEND_FROM_EMAIL           → MailerSend sender email (SERVER ONLY)
NEXT_PUBLIC_APP_URL             → Full app URL e.g. https://bookmarks-app.vercel.app
```

`NEXT_PUBLIC_` prefix = visible to browser. Never put secrets there.

---

## File Structure With Purpose of Each File

```
src/
│
├── middleware.ts
│   └── Runs on EVERY request. Refreshes session. Blocks /dashboard for logged-out users.
│       Redirects logged-in users away from /login and /signup.
│
├── types/index.ts
│   └── TypeScript types for Bookmark and Profile. Used everywhere.
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts       → Browser Supabase client. Use in 'use client' files only.
│   │   ├── server.ts       → Server Supabase client. Use in Server Components + API routes.
│   │   └── middleware.ts   → Session refresh logic. Used only by src/middleware.ts.
│
├── components/
│   ├── BookmarkCard.tsx    → Displays one bookmark. Has edit/delete buttons. Client Component.
│   ├── BookmarkForm.tsx    → Add or edit a bookmark form. Client Component.
│   ├── Dashboard.tsx       → Full dashboard UI with state. Client Component.
│   └── LogoutButton.tsx    → Logout button. Client Component.
│
└── app/
    ├── page.tsx                        → Redirects to /dashboard or /login based on auth.
    ├── not-found.tsx                   → 404 page.
    │
    ├── (auth)/                         → Route group. URLs are /login and /signup (no /auth/ prefix).
    │   ├── login/page.tsx              → Login form. Client Component.
    │   └── signup/page.tsx             → Signup form. Client Component.
    │
    ├── dashboard/
    │   └── page.tsx                    → Protected page. Server Component. Fetches data, renders Dashboard.
    │
    ├── [handle]/
    │   └── page.tsx                    → Public profile. Server Component. Shows public bookmarks.
    │
    └── api/
        ├── welcome/route.ts            → POST. Sends welcome email via MailerSend.
        └── bookmarks/route.ts          → GET/POST/PATCH/DELETE. All bookmark operations.
```

---

## The Most Important Concept: Two Supabase Clients

This is the #1 source of bugs. Understand it completely.

### Browser Client (`lib/supabase/client.ts`)
- Created with `createBrowserClient` from `@supabase/ssr`
- Reads session from browser cookies
- Only works in files with `'use client'` at the top
- If used on the server → auth always fails silently

### Server Client (`lib/supabase/server.ts`)
- Created with `createServerClient` from `@supabase/ssr`
- Reads session from HTTP request cookies
- Used in Server Components, API routes (`route.ts`), middleware
- If used in a client component → will error because `next/headers` is server-only

### Rule
```
File has 'use client'?  → import from '@/lib/supabase/client'
File has no 'use client'? → import from '@/lib/supabase/server'
```

---

## API Routes Reference

### `GET /api/bookmarks`
Returns all bookmarks for the logged-in user.
Auth required. Returns 401 if not logged in.

### `POST /api/bookmarks`
Creates a new bookmark.
Body: `{ title: string, url: string, is_public: boolean }`
Auth required.

### `PATCH /api/bookmarks`
Updates an existing bookmark.
Body: `{ id: string, title: string, url: string, is_public: boolean }`
Auth required. Only works on bookmarks owned by the logged-in user.

### `DELETE /api/bookmarks`
Deletes a bookmark.
Body: `{ id: string }`
Auth required. Only works on bookmarks owned by the logged-in user.

### `POST /api/welcome`
Sends a welcome email.
Body: `{ email: string, handle: string }`
Called by signup page after successful account creation.

---

## What "Done" Looks Like

The app is complete when:
- [ ] Signup creates a user + profile row + sends welcome email
- [ ] Login works and redirects to dashboard
- [ ] Dashboard shows all bookmarks (public + private)
- [ ] Add / edit / delete all work
- [ ] `/dashboard` redirects to `/login` when logged out
- [ ] `/<handle>` shows only public bookmarks, no login needed
- [ ] `/<invalid-handle>` shows 404
- [ ] Two users cannot have the same handle
- [ ] User A cannot see/edit/delete User B's bookmarks
- [ ] App is deployed on Vercel with a working live URL
