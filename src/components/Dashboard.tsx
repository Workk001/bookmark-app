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
    if (res.ok) {
      const data = await res.json()
      if (data.bookmarks) {
        setBookmarks(data.bookmarks)
      }
    }
  }

  function handleDelete(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">My Bookmarks</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              @{profile.handle} ·{' '}
              <a
                href={`/${profile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
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
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 font-medium text-zinc-950">Add Bookmark</h2>
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
              className="w-full rounded-xl bg-zinc-950 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              + Add Bookmark
            </button>
          )}
        </div>

        {/* Bookmarks List */}
        {bookmarks.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <p className="text-lg">No bookmarks yet.</p>
            <p className="mt-1 text-sm">Add your first one above.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={refreshBookmarks}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}