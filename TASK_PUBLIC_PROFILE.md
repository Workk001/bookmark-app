# TASK_PUBLIC_PROFILE.md — Public Profile Page

## What We're Building
A page at `/<handle>` (e.g., `/john`) that:
- Anyone can visit — no login required
- Shows only the public bookmarks of that user
- Returns a 404 if the handle doesn't exist
- Never exposes private bookmarks, even if you hit the URL directly

---

## How Dynamic Routes Work in Next.js

The folder `src/app/[handle]/` creates a dynamic route.
The `[handle]` part is a placeholder. When someone visits `/john`, Next.js puts `"john"` into `params.handle`.

This is how every profile page in the world works — Twitter's `/@username`, GitHub's `/username`, etc.

---

## Why This Page Is Safe Without Auth

Because of the RLS policy we set:
```sql
create policy "Anyone can view public bookmarks"
  on bookmarks for select
  using (is_public = true);
```

This means: even without a logged-in user, the query will ONLY return rows where `is_public = true`. Private bookmarks are invisible at the database level — they don't even come back in the response.

So there's no way to "trick" the API into showing private bookmarks. The DB itself refuses.

---

## Step 1 — Public Profile Page

### `src/app/[handle]/page.tsx`

This is a **Server Component** (no `'use client'`).
Server Components run on the server, fetch data, and send HTML to the browser.
No loading spinners, no client-side fetching — the page arrives with data already in it.

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Bookmark, Profile } from '@/types'

type Props = {
  params: Promise<{ handle: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params
  const supabase = await createClient()

  // 1. Find the profile by handle
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .single()

  // If handle doesn't exist, show 404
  if (!profile) {
    notFound()
  }

  // 2. Get only public bookmarks for this user
  // RLS also enforces this, but the .eq('is_public', true) makes intent clear
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">@{profile.handle}</h1>
          <p className="text-gray-500 mt-1">
            {bookmarks?.length ?? 0} public bookmark{bookmarks?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Bookmarks List */}
        {!bookmarks || bookmarks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No public bookmarks yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark: Bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <p className="font-medium">{bookmark.title}</p>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {bookmark.url}
                </p>
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-12">
          Powered by Bookmarks App
        </p>
      </div>
    </div>
  )
}

// Generate metadata for the page (tab title, etc.)
export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  return {
    title: `@${handle} — Bookmarks`,
    description: `Public bookmarks shared by @${handle}`,
  }
}
```

---

## Step 2 — 404 Page (Optional but Nice)

### `src/app/not-found.tsx`

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-gray-600 mt-4">This profile doesn't exist.</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-black underline"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
```

---

## Route Conflict Warning

The `[handle]` route will match ANY path that isn't explicitly defined.
This means `/dashboard`, `/login`, `/signup` must be defined BEFORE `[handle]` catches them.

Next.js handles this correctly — explicit routes always win over dynamic routes.
So `/dashboard` → goes to `src/app/dashboard/page.tsx`, not `[handle]`.

But if you accidentally name a route the same as a handle, it'll conflict.
This is fine for this task — just be aware.

---

## Common Agent Mistakes to Watch For

1. **Agent fetches all bookmarks and then filters `is_public` in JavaScript.**
   ```typescript
   // WRONG — fetches all then filters in JS
   const { data } = await supabase.from('bookmarks').select('*').eq('user_id', profile.id)
   const public = data.filter(b => b.is_public)
   ```
   This is wrong because it fetches private bookmarks from the DB and then hides them in code. RLS would actually prevent this (you'd get empty results for private ones), but the intent is wrong. Always filter at the query level.

2. **Agent uses a Client Component for this page and fetches on the client.**
   - This works but adds unnecessary loading states. This page has no interactivity — use a Server Component.

3. **Agent forgets to handle `notFound()` and shows a blank page for invalid handles.**
   - Always call `notFound()` when profile is null.

4. **Agent uses `params.handle` directly without awaiting `params`.**
   - In Next.js 15+, `params` is a Promise. Always `await params` first.

---

## After This Task
Commit with: `git commit -m "feat: public profile page at /[handle]"`

Then move to `TASK_DASHBOARD.md`.
