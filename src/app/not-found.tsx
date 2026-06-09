import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-200">404</h1>
        <p className="mt-4 text-zinc-600">This profile doesn&apos;t exist.</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-zinc-950 underline"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
