'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

const handlePattern = /^[a-zA-Z0-9_]+$/

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const normalizedHandle = handle.trim()

    if (!handlePattern.test(normalizedHandle)) {
      setError('Handle can only contain letters, numbers, and underscores.')
      setIsSubmitting(false)
      return
    }

    const lookupResponse = await fetch(
      `/api/check-handle?handle=${encodeURIComponent(normalizedHandle)}`,
    )

    if (!lookupResponse.ok) {
      setError('Unable to check handle availability right now.')
      setIsSubmitting(false)
      return
    }

    const { taken } = (await lookupResponse.json()) as { taken: boolean }

    if (taken) {
      setError('That handle is already taken.')
      setIsSubmitting(false)
      return
    }

    const {
      data: { user },
      error: signUpError,
    } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    if (!user) {
      setError('Signup did not return a user.')
      setIsSubmitting(false)
      return
    }

    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        handle: normalizedHandle,
      })

    if (insertProfileError) {
      setError(insertProfileError.message)
      setIsSubmitting(false)
      return
    }

    const welcomeResponse = await fetch('/api/welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        handle: normalizedHandle,
      }),
    })

    if (!welcomeResponse.ok) {
      setError('Your account was created, but the welcome email failed.')
      setIsSubmitting(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-zinc-500">Bookmarks App</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Create account
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Handle
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              type="text"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link className="font-medium text-zinc-950 underline" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
