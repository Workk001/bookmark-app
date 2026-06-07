# TASK_AUTH.md — Authentication

## What We're Building
- Signup page (email + password + @handle)
- Login page
- Session management (stay logged in across page refreshes)
- Middleware that blocks /dashboard for logged-out users
- Welcome email sent on signup via Resend

---

## Why Supabase Auth?
Supabase Auth handles the hard parts: password hashing, session tokens, JWT management.
You don't store passwords yourself. You just call `supabase.auth.signUp()` and Supabase does everything securely.

Think of it like this:
- Supabase = the bouncer who checks IDs
- Your app = the club that trusts the bouncer's decision

---

## Step 1 — Create Supabase Clients

### `src/lib/supabase/client.ts`
This is for CLIENT COMPONENTS only (browser-side).
It reads the session from browser cookies.

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts`
This is for SERVER COMPONENTS and API ROUTES only.
It reads the session from request cookies (not the browser).

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### `src/lib/supabase/middleware.ts`
This refreshes the session on every request so tokens don't expire mid-session.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect logged-out users away from /dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from /login and /signup
  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

---

## Step 2 — Root Middleware

### `src/middleware.ts`
Next.js runs this file on EVERY request before the page loads.
It's the security gate.

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Why the matcher?** We don't want to run auth logic on static files (images, fonts). The regex skips those.

---

## Step 3 — TypeScript Types

### `src/types/index.ts`

```typescript
export type Bookmark = {
  id: string
  user_id: string
  title: string
  url: string
  is_public: boolean
  created_at: string
}

export type Profile = {
  id: string
  handle: string
  created_at: string
}
```

---

## Step 4 — Resend Email Client

### `src/lib/resend.ts`

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
```

---

## Step 5 — Welcome Email API Route

### `src/app/api/welcome/route.ts`
This route is called by the frontend after a successful signup.
It sends a welcome email using Resend.

```typescript
import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function POST(request: Request) {
  const { email, handle } = await request.json()

  if (!email || !handle) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from: 'Bookmarks App <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to Bookmarks App!',
      html: `
        <h1>Welcome, @${handle}!</h1>
        <p>Your account is ready. Start saving bookmarks at:</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">
          ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
        </a></p>
        <p>Your public profile: 
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/${handle}">
            ${process.env.NEXT_PUBLIC_APP_URL}/${handle}
          </a>
        </p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
```

**Important**: `onboarding@resend.dev` is Resend's test sender. It works without a custom domain. For production you'd use your own domain, but for this task it's fine.

---

## Step 6 — Signup Page

### `src/app/(auth)/signup/page.tsx`

What this page does:
1. Takes email, password, and @handle
2. Checks if handle is already taken (query profiles table)
3. Creates the Supabase auth user
4. Inserts a row into profiles table with the handle
5. Calls /api/welcome to send the email
6. Redirects to /dashboard

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    setError('')
    setLoading(true)

    // Validate handle format (only letters, numbers, underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      setError('Handle can only contain letters, numbers, and underscores')
      setLoading(false)
      return
    }

    // Check if handle is already taken
    const { data: existingHandle } = await supabase
      .from('profiles')
      .select('handle')
      .eq('handle', handle)
      .single()

    if (existingHandle) {
      setError('This handle is already taken')
      setLoading(false)
      return
    }

    // Create auth user
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signupError || !data.user) {
      setError(signupError?.message || 'Signup failed')
      setLoading(false)
      return
    }

    // Insert profile with handle
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, handle })

    if (profileError) {
      setError('Failed to create profile')
      setLoading(false)
      return
    }

    // Send welcome email
    await fetch('/api/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, handle }),
    })

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Create your account</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">@Handle</label>
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value.toLowerCase())}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="yourhandle"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your public profile will be at /{handle}
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </div>

        <p className="text-sm text-center mt-4 text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-black font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Step 7 — Login Page

### `src/app/(auth)/login/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Log in</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>

        <p className="text-sm text-center mt-4 text-gray-600">
          No account?{' '}
          <Link href="/signup" className="text-black font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Common Agent Mistakes to Watch For

1. **Agent uses `createClient()` from `client.ts` inside a Server Component or API route.**
   - How to catch it: if you see `import { createClient } from '@/lib/supabase/client'` in a file that doesn't have `'use client'` at the top → wrong.
   - Fix: change the import to `@/lib/supabase/server`

2. **Agent forgets `router.refresh()` after login.**
   - Without it, the server-side session doesn't update and middleware might still think you're logged out.

3. **Agent puts the handle check after the signup call.**
   - Handle uniqueness must be checked BEFORE creating the auth user, otherwise you create a user with no profile.

4. **Agent uses `supabase.auth.signUp()` with `emailRedirectTo` and expects email confirmation.**
   - For this task, disable email confirmation in Supabase dashboard: Authentication → Email → disable "Confirm email".

---

## After This Task
Commit with: `git commit -m "feat: auth - signup, login, session, welcome email"`

Then move to `TASK_BOOKMARKS.md`.
