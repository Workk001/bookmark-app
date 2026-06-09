import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Bookmark } from '@/types'

type Props = {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  return {
    title: `@${handle} — Bookmarks`,
    description: `Public bookmarks shared by @${handle}`,
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params
  const supabase = await createClient()

  // Find the profile by handle
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .single()

  if (!profile) {
    notFound()
  }

  // Get only public bookmarks — filtered at the DB level, not in JS
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-950">@{profile.handle}</h1>
          <p className="mt-1 text-zinc-500">
            {bookmarks?.length ?? 0} public bookmark
            {bookmarks?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Bookmarks List */}
        {!bookmarks || bookmarks.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
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
                className="block rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <p className="font-medium text-zinc-950">{bookmark.title}</p>
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  {bookmark.url}
                </p>
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-center text-sm text-zinc-400">
          Powered by Bookmarks App
        </p>
      </div>
    </main>
  )
}
