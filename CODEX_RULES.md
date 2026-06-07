# CODEX_RULES.md — Rules, Patterns & Anti-Patterns

> These are hard rules. Do not deviate from them.
> Every rule here exists because it prevents a real bug or security issue.

---

## RULE 1 — Always Use The Correct Supabase Client

| Where you're writing code | Client to use | Import path |
|---|---|---|
| `'use client'` component | Browser client | `@/lib/supabase/client` |
| Server Component (no `'use client'`) | Server client | `@/lib/supabase/server` |
| `app/api/**/route.ts` | Server client | `@/lib/supabase/server` |
| `src/middleware.ts` | Middleware helper | `@/lib/supabase/middleware` |

**Wrong:**
```typescript
// Inside app/api/bookmarks/route.ts
import { createClient } from '@/lib/supabase/client' // ❌ Browser client in server file
```

**Correct:**
```typescript
// Inside app/api/bookmarks/route.ts
import { createClient } from '@/lib/supabase/server' // ✅
```

---

## RULE 2 — Always Use `getUser()` Not `getSession()`

`getSession()` reads the JWT from the local cookie without verifying it with Supabase servers. It can be tampered with.

`getUser()` always makes a network call to verify the token is real and not expired.

**Wrong:**
```typescript
const { data: { session } } = await supabase.auth.getSession() // ❌
const user = session?.user
```

**Correct:**
```typescript
const { data: { user } } = await supabase.auth.getUser() // ✅
```

---

## RULE 3 — Always Check Auth Before Touching The Database

Every API route must check `getUser()` before any DB operation.
Never rely on RLS alone to catch unauthenticated requests — return 401 early.

**Wrong:**
```typescript
export async function DELETE(request: Request) {
  const { id } = await request.json()
  await supabase.from('bookmarks').delete().eq('id', id) // ❌ No auth check
}
```

**Correct:**
```typescript
export async function DELETE(request: Request) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) // ✅

  const { id } = await request.json()
  await supabase.from('bookmarks').delete().eq('id', id).eq('user_id', user.id)
}
```

---

## RULE 4 — Always Add `.eq('user_id', user.id)` On Write Operations

RLS already enforces this, but add the explicit check too.
Two layers of protection is better than one. It also makes intent obvious when reading the code.

**Wrong:**
```typescript
await supabase.from('bookmarks').delete().eq('id', id) // ❌
```

**Correct:**
```typescript
await supabase.from('bookmarks').delete().eq('id', id).eq('user_id', user.id) // ✅
```

---

## RULE 5 — Never Put Secrets In `NEXT_PUBLIC_` Variables

`NEXT_PUBLIC_` variables are bundled into the browser JavaScript. Anyone can read them.

**Wrong:**
```
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=xxx  ❌
NEXT_PUBLIC_RESEND_API_KEY=xxx             ❌
```

**Correct:**
```
SUPABASE_SERVICE_ROLE_KEY=xxx  ✅  (server only)
RESEND_API_KEY=xxx             ✅  (server only)
```

---

## RULE 6 — Never Import Server-Only Code In Client Components

`next/headers`, `next/cookies`, and the server Supabase client all use Node.js APIs.
They crash if imported in a `'use client'` file.

**Wrong:**
```typescript
'use client'
import { createClient } from '@/lib/supabase/server' // ❌ Will crash
import { cookies } from 'next/headers'               // ❌ Will crash
```

---

## RULE 7 — Always `await params` In Dynamic Routes

In Next.js 15+, `params` in page components is a Promise, not a plain object.

**Wrong:**
```typescript
export default function Page({ params }: { params: { handle: string } }) {
  const handle = params.handle // ❌ TypeScript error + runtime bug
}
```

**Correct:**
```typescript
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params // ✅
}
```

---

## RULE 8 — Call `router.refresh()` After Login and Logout

Next.js caches server-rendered pages. After auth changes, you must invalidate that cache.
Without `refresh()`, the user might see stale data (logged-out state after login, or vice versa).

**Wrong:**
```typescript
await supabase.auth.signInWithPassword({ email, password })
router.push('/dashboard') // ❌ Server cache might still think user is logged out
```

**Correct:**
```typescript
await supabase.auth.signInWithPassword({ email, password })
router.push('/dashboard')
router.refresh() // ✅
```

---

## RULE 9 — Validate URL Format On The Server

Frontend validation is UX. Server validation is security. Always do both.

**Correct (in API route):**
```typescript
try {
  new URL(url) // Built-in URL constructor throws if invalid
} catch {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
}
```

---

## RULE 10 — Check Handle Availability BEFORE Creating Auth User

If you create the auth user first and then the handle is taken, you have an orphan user with no profile. Clean up is hard.

**Wrong order:**
```
1. supabase.auth.signUp()      ❌ Creates user
2. check if handle is taken    ❌ Too late — user exists with no profile
```

**Correct order:**
```
1. Validate handle format
2. Check if handle is taken in profiles table  ✅
3. supabase.auth.signUp()                      ✅ Only if handle is available
4. Insert profile row                          ✅
5. Call /api/welcome                           ✅
```

---

## Patterns To Use

### Pattern: Server Component fetches, Client Component renders
```typescript
// dashboard/page.tsx (Server Component)
const { data: bookmarks } = await supabase.from('bookmarks').select('*')
return <Dashboard initialBookmarks={bookmarks} /> // passes data as props

// components/Dashboard.tsx (Client Component)
'use client'
const [bookmarks, setBookmarks] = useState(initialBookmarks) // starts with server data
```
Why: Fast initial load (no spinner), then interactive client-side updates.

### Pattern: Early return on auth failure
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// rest of the handler — always has a valid user here
```
Why: Keeps the code flat, avoids nested if-else chains.

### Pattern: Optimistic local state update
```typescript
function handleDelete(id: string) {
  setBookmarks(prev => prev.filter(b => b.id !== id)) // update UI immediately
  // API call happens in background
}
```
Why: UI feels instant instead of waiting for the server.

---

## Anti-Patterns To Avoid

### ❌ Filtering private bookmarks in JavaScript after fetching all
```typescript
const { data } = await supabase.from('bookmarks').select('*')
const publicOnly = data.filter(b => b.is_public) // Wrong — you already fetched private ones
```
Always filter at the query level: `.eq('is_public', true)`

### ❌ Using `useEffect` to fetch data that could be server-fetched
```typescript
'use client'
useEffect(() => {
  fetch('/api/bookmarks').then(...) // Causes loading spinner on every visit
}, [])
```
For initial data, use a Server Component. Only use `useEffect` fetching for user-triggered refreshes.

### ❌ One giant commit
The evaluators review your git history. Commit after each feature:
```
feat: setup supabase clients and middleware
feat: auth - signup and login pages
feat: welcome email via resend
feat: bookmarks API routes
feat: bookmark components (card and form)
feat: dashboard page
feat: public profile page
docs: README
```

### ❌ Hardcoding the app URL
```typescript
href="http://localhost:3000/dashboard" // ❌ Breaks in production
```
Always use:
```typescript
href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`} // ✅
```

### ❌ Using the deprecated auth-helpers package
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs' // ❌ Deprecated
```
Always use `@supabase/ssr`:
```typescript
import { createBrowserClient } from '@supabase/ssr' // ✅
```

---

## Quick Reference: What Goes Where

| Thing | Where it lives | Why |
|---|---|---|
| Supabase browser client | `lib/supabase/client.ts` | Reusable, single source of truth |
| Supabase server client | `lib/supabase/server.ts` | Reusable, reads request cookies |
| Session refresh + route guard | `src/middleware.ts` | Runs before every page load |
| TypeScript types | `types/index.ts` | Shared across all files |
| Email sending | `app/api/welcome/route.ts` | Server-side, keeps API key private |
| Bookmark CRUD | `app/api/bookmarks/route.ts` | Server-side, RLS + auth enforced |
| Public profile | `app/[handle]/page.tsx` | Server Component, SEO-friendly |
| Dashboard | `app/dashboard/page.tsx` + `components/Dashboard.tsx` | Server fetches, client interacts |
