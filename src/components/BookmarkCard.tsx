'use client'

import { useState } from 'react'
import type { Bookmark } from '@/types'
import BookmarkForm from './BookmarkForm'

type Props = {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onUpdate: () => void
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
      <li className="rounded-xl border border-zinc-200 bg-white p-4">
        <BookmarkForm
          bookmark={bookmark}
          onSuccess={() => {
            setIsEditing(false)
            onUpdate()
          }}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-medium text-zinc-950 hover:underline"
        >
          {bookmark.title}
        </a>
        <p className="mt-0.5 truncate text-sm text-zinc-500">{bookmark.url}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
            bookmark.is_public
              ? 'bg-green-100 text-green-700'
              : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          {bookmark.is_public ? 'Public' : 'Private'}
        </span>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-zinc-600 transition hover:text-zinc-950"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 transition hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </li>
  )
}
