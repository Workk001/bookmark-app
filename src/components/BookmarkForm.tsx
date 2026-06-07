'use client'

import { FormEvent, useState } from 'react'
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          placeholder="My favourite article"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          placeholder="https://example.com"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={isEditing ? `isPublic-${bookmark.id}` : 'isPublic-new'}
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        <label
          htmlFor={isEditing ? `isPublic-${bookmark.id}` : 'isPublic-new'}
          className="text-sm text-zinc-700"
        >
          Make public (visible on your profile)
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Add Bookmark'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
