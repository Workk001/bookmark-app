'use client'

import { useState } from 'react'
import BookmarkForm from '@/components/BookmarkForm'
import BookmarkCard from '@/components/BookmarkCard'

interface Bookmark {
  id: string
  title: string
  url: string
  is_public: boolean
  created_at: string
}

interface Profile {
  id: string
  handle: string
}

interface Props {
  initialBookmarks: Bookmark[]
  profile: Profile | null
}

export default function Dashboard({ initialBookmarks, profile }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [showForm, setShowForm] = useState(false)

  async function refreshBookmarks() {
    const res = await fetch('/api/bookmarks')
    if (res.ok) {
      const data = await res.json()
      setBookmarks(data)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950">My Bookmarks</h1>
            {profile && (
              <p className="text-sm text-zinc-500">@{profile.handle}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {showForm ? 'Cancel' : '+ Add Bookmark'}
            </button>
            <link
              href="/api/signout"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Sign out
            </link>
          </div>
        </div>

        {showForm && (
          <div className="mb-6">
            <BookmarkForm
              onSuccess={() => {
                setShowForm(false)
                refreshBookmarks()
              }}
            />
          </div>
        )}

        {bookmarks.length === 0 ? (
          <p className="text-center text-zinc-500">No bookmarks yet. Add one above.</p>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((b) => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                onDelete={(id) => setBookmarks(bookmarks.filter((bm) => bm.id !== id))}
                onUpdate={refreshBookmarks}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}