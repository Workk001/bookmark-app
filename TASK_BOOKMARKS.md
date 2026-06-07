# TASK_BOOKMARKS.md — Bookmarks CRUD

## What We're Building
- API routes to create, read, update, delete bookmarks
- Bookmark form component (add/edit)
- Bookmark card component (display + delete)
- All operations are server-side and protected by RLS

---

## Why API Routes Instead of Direct DB Calls From The Client?

You could call Supabase directly from the browser. It would work.
But using API routes (`/api/bookmarks`) is cleaner because:
1. All DB logic lives in one place
2. You can add extra validation before hitting the DB
3. The server Supabase client has access to the full session cookie

For this task, both approaches are acceptable. We'll use API routes to show we understand server-side patterns.

---

## How RLS Works (The Key Concept)

RLS = Row Level Security. It's a rule set inside the database itself.

The rule we set up says:
> "A user can only SELECT, INSERT, UPDATE, DELETE rows where `user_id = auth.uid()`"

`auth.uid()` is the currently logged-in user's ID, which Supabase reads from the session token.

So even if someone sends a DELETE request for bookmark ID `abc123` that belongs to another user — Supabase checks `user_id = auth.uid()`, sees it doesn't match, and returns nothing. The row is invisible to them.

This is why RLS is a REAL security requirement, not a UI detail.

---

## Step 1 — Bookmarks API Route

### `src/app/api/bookmarks/route.ts`

This single file handles all 4 operations using HTTP methods:
- `GET` → fetch all bookmarks for logged-in user
- `POST` → create a new bookmark
- `PATCH` → update a bookmark
- `DELETE` → delete a bookmark

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch user's bookmarks
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookmarks: data })
}

// POST — create a bookmark
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, url, is_public } = await request.json()

  if (!title || !url) {
    return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
  }

  // Basic URL validation
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: user.id, title, url, is_public: is_public ?? false })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookmark: data }, { status: 201 })
}

// PATCH — update a bookmark
export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, title, url, is_public } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Bookmark ID required' }, { status: 400 })
  }

  // RLS will silently reject this if the bookmark doesn't belong to the user
  const { data, error } = await supabase
    .from('bookmarks')
    .update({ title, url, is_public })
    .eq('id', id)
    .eq('user_id', user.id) // Explicit check + RLS = double protection
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookmark: data })
}

// DELETE — delete a bookmark
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Bookmark ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Notice**: Every route checks `auth.getUser()` first. If no user → 401 immediately. We never touch the DB for unauthenticated requests.

---

## Step 2 — BookmarkForm Component

### `src/components/BookmarkForm.tsx`
Used for both creating AND editing a bookmark.
If you pass an existing bookmark as a prop → edit mode.
If you pass nothing → create mode.

```typescript
'use client'

import { useState } from 'react'
import type { Bookmark } from '@/types'

type Props = {
  bookmark?: Bookmark
  onSuccess: () => void
  onCancel?: () => void
}

export default function BookmarkForm({ bookmark, onSuccess, onCancel }: Props) {
  const [title, setTitle] = useState(bookmark?.title ?? '')
  const [url, setUrl] = useState(bookmark?.url ?? '')
  const [isPublic, setIsPublic] = useState(bookmark?.is_public ?? false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEditing = !!bookmark

  async function handleSubmit() {
    setError('')
    setLoading(true)

    const method = isEditing ? 'PATCH' : 'POST'
    const body = isEditing
      ? { id: bookmark.id, title, url, is_public: isPublic }
      : { title, url, is_public: isPublic }

    const res = await fetch('/api/bookmarks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="My favourite article"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="https://example.com"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="isPublic" className="text-sm">
          Make public (visible on your profile)
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Bookmark'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Step 3 — BookmarkCard Component

### `src/components/BookmarkCard.tsx`

```typescript
'use client'

import { useState } from 'react'
import type { Bookmark } from '@/types'
import BookmarkForm from './BookmarkForm'

type Props = {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onUpdate: (bookmark: Bookmark) => void
}

export default function BookmarkCard({ bookmark, onDelete, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch('/api/bookmarks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookmark.id }),
    })

    if (res.ok) {
      onDelete(bookmark.id)
    }
    setDeleting(false)
  }

  if (isEditing) {
    return (
      <div className="border rounded-xl p-4">
        <BookmarkForm
          bookmark={bookmark}
          onSuccess={() => {
            setIsEditing(false)
            // Refresh parent to get updated data
            onUpdate({ ...bookmark })
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="border rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline truncate block"
        >
          {bookmark.title}
        </a>
        <p className="text-sm text-gray-500 truncate">{bookmark.url}</p>
        <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
          bookmark.is_public
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {bookmark.is_public ? 'Public' : 'Private'}
        </span>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-600 hover:text-black"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
```

---

## Common Agent Mistakes to Watch For

1. **Agent uses the browser Supabase client inside `/api/bookmarks/route.ts`.**
   - The API route is server-side. Using the browser client here means auth won't work.
   - Fix: `import { createClient } from '@/lib/supabase/server'`

2. **Agent forgets to check `auth.getUser()` and relies only on RLS.**
   - RLS protects the data, but you still want to return 401 early so the client knows it's unauthorized, not just getting empty data.

3. **Agent validates URL format on the frontend only.**
   - Always validate on the server too. Frontend validation is just UX, not security.

4. **Agent uses `.upsert()` instead of separate insert/update.**
   - Upsert can cause unexpected behavior with RLS. Use explicit POST for create and PATCH for update.

---

## After This Task
Commit with: `git commit -m "feat: bookmarks CRUD with RLS protection"`

Then move to `TASK_PUBLIC_PROFILE.md`.
