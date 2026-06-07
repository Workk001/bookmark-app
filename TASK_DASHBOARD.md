# TASK_DASHBOARD.md — Protected Dashboard

## What We're Building
- The main page users land on after login
- Shows all their bookmarks (public + private)
- Add new bookmarks
- Edit and delete existing ones
- Logout button
- Blocked for logged-out users (handled by middleware)

---

## Why This Is a Server Component With Client Components Inside

The dashboard page itself is a Server Component.
It runs on the server, checks auth, fetches initial bookmarks, and sends the HTML.

But the interactive parts (add form, edit, delete) need to respond to user clicks.
Those are Client Components.

This is the React Server Components pattern:
- Server Component = shell, data fetching, auth check
- Client Components = anything interactive

Think of it like a restaurant:
- Server Component = the kitchen (prepares everything)
- Client Component = the waiter (handles live interaction at the table)

---

## Step 1 — Logout Button Component

### `src/components/LogoutButton.tsx`
A simple client component because it calls a Supabase method on click.

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-black"
    >
      Log out
    </button>
  )
}
```

---

## Step 2 — Dashboard Client Component

### `src/components/Dashboard.tsx`
This holds all the interactive state: the bookmark list, add form visibility, etc.
It receives the initial data from the server as props.

```typescript
'use client'

import { useState } from 'react'
import type { Bookmark, Profile } from '@/types'
import BookmarkCard from './BookmarkCard'
import BookmarkForm from './BookmarkForm'
import LogoutButton from './LogoutButton'

type Props = {
  initialBookmarks: Bookmark[]
  profile: Profile
}

export default function Dashboard({ initialBookmarks, profile }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [showAddForm, setShowAddForm] = useState(false)

  async function refreshBookmarks() {
    const res = await fetch('/api/bookmarks')
    const data = await res.json()
    if (data.bookmarks) {
      setBookmarks(data.bookmarks)
    }
  }

  function handleDelete(id: string) {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  function handleUpdate(updated: Bookmark) {
    refreshBookmarks()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Bookmarks</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              @{profile.handle} ·{' '}
              <a
                href={`/${profile.handle}`}
                target="_blank"
                className="underline"
              >
                View public profile
              </a>
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Add Bookmark */}
        <div className="mb-6">
          {showAddForm ? (
            <div className="bg-white border rounded-xl p-4">
              <h2 className="font-medium mb-3">Add Bookmark</h2>
              <BookmarkForm
                onSuccess={() => {
                  setShowAddForm(false)
                  refreshBookmarks()
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-medium"
            >
              + Add Bookmark
            </button>
          )}
        </div>

        {/* Bookmarks List */}
        {bookmarks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No bookmarks yet.</p>
            <p className="text-sm mt-1">Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map(bookmark => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Step 3 — Dashboard Page (Server Component)

### `src/app/dashboard/page.tsx`
This is the actual page file. It:
1. Checks the session (middleware already blocked logged-out users, but we double-check)
2. Fetches the user's profile and bookmarks
3. Passes them to the Dashboard client component as props

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Double-check auth (middleware handles this but belt-and-suspenders)
  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get all bookmarks (private + public) for this user
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <Dashboard
      initialBookmarks={bookmarks ?? []}
      profile={profile}
    />
  )
}
```

---

## Step 4 — Home Page Redirect

### `src/app/page.tsx`
The root `/` page should redirect based on auth state.

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

---

## The Data Flow — How It All Connects

```
User visits /dashboard
        ↓
middleware.ts runs → checks session → if no session, redirect to /login
        ↓
DashboardPage (Server Component) runs on the server
        ↓
Fetches profile + bookmarks from Supabase (server-side, using cookies)
        ↓
Passes data as props to <Dashboard> (Client Component)
        ↓
Dashboard renders with data already loaded (no spinner)
        ↓
User clicks "Delete" → fetch('/api/bookmarks', DELETE) → updates local state
```

No loading states for the initial render. Fast, secure, clean.

---

## Common Agent Mistakes to Watch For

1. **Agent makes the entire dashboard a Client Component and fetches data with `useEffect`.**
   ```typescript
   // WRONG pattern
   'use client'
   useEffect(() => {
     fetch('/api/bookmarks').then(...)
   }, [])
   ```
   This works but it means users see a loading spinner on every visit. Use a Server Component for the initial fetch.

2. **Agent forgets to pass `profile` to the Dashboard component.**
   - Without the profile, you can't show the @handle or link to the public page.

3. **Agent calls `supabase.auth.getSession()` instead of `supabase.auth.getUser()`.**
   - `getSession()` reads from the local cookie without verifying with Supabase's server. It can be spoofed.
   - `getUser()` always verifies with Supabase's server. Always use this for auth checks.

4. **Agent doesn't call `router.refresh()` after logout.**
   - Without `refresh()`, Next.js still has the old server-side cache. The user might still see the dashboard briefly after logout.

---

## After This Task
Commit with: `git commit -m "feat: dashboard with bookmark management"`

Then move to `TASK_DEPLOY.md`.
