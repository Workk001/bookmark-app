# AGENTS.md — Bookmarks App: Master Guide

## What This App Is
A personal bookmarks manager — think "Linktree meets Pocket".
Users sign up, save bookmarks (public or private), and get a public profile page at `/<handle>` that anyone can visit without logging in.

---

## Tech Stack (do not deviate)
- **Framework**: Next.js 16, App Router, TypeScript
- **Styling**: Tailwind CSS
- **Auth + DB**: Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- **Email**: Resend
- **Deployment**: Vercel

---

## Project Folder Structure
```
src/
├── app/
│   ├── middleware.ts              # Protects /dashboard from logged-out users
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx         # Protected: shows user's bookmarks
│   ├── [handle]/page.tsx          # Public: shows a user's public bookmarks
│   └── api/
│       ├── welcome/route.ts       # Sends welcome email via Resend
│       └── bookmarks/route.ts     # CRUD for bookmarks
├── components/
│   ├── BookmarkCard.tsx
│   ├── BookmarkForm.tsx
│   └── LogoutButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser-side Supabase client
│   │   ├── server.ts              # Server-side Supabase client
│   │   └── middleware.ts          # Session refresh utility
│   └── resend.ts                  # Resend email client
└── types/
    └── index.ts                   # TypeScript types
```

---

## Non-Negotiable Rules

### 1. Always use the correct Supabase client
- In **Server Components, API routes, middleware** → always use `src/lib/supabase/server.ts`
- In **Client Components** (files with `'use client'`) → use `src/lib/supabase/client.ts`
- **Never use the browser client on the server.** This is the #1 mistake agents make. The browser client cannot read server-side cookies, so auth breaks silently.

### 2. RLS is the real security layer
- Row Level Security (RLS) is enabled on all tables.
- Never trust the frontend to enforce data ownership. Always let RLS do it at the DB level.
- Even if someone calls the API directly with another user's ID, Supabase will block it.

### 3. Never expose the service role key to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (API routes).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for the browser.
- Any env var starting with `NEXT_PUBLIC_` is visible to everyone. Never put secrets there.

### 4. Commit as you go
- Commit after each feature, not one giant commit at the end.
- The evaluators review commit history.

### 5. Use `@supabase/ssr` — not the old `@supabase/auth-helpers-nextjs`
- The old package is deprecated. Do not use it even if you've seen it before.

---

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Task Files
Work through these in order:
1. `TASK_AUTH.md` — Signup, login, session management, welcome email
2. `TASK_BOOKMARKS.md` — CRUD for bookmarks, API routes, RLS
3. `TASK_PUBLIC_PROFILE.md` — Public @handle profile page
4. `TASK_DASHBOARD.md` — Protected dashboard UI
5. `TASK_DEPLOY.md` — Vercel deployment and env var setup

Complete each task fully before moving to the next.
