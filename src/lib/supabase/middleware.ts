import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/types'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<ReturnType<typeof NextResponse.next>['cookies']['set']>[2]
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  let user = null

  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err: unknown) {
    // Stale refresh tokens cause AuthApiError — clear cookies and treat as logged out
    const isAuthError =
      err instanceof Error &&
      (err.message.includes('Refresh Token') ||
        err.message.includes('refresh_token'))

    if (isAuthError) {
      // Delete all Supabase auth cookies so the stale session is gone
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) {
          request.cookies.delete(name)
          response.cookies.delete(name)
        }
      })
    }
  }

  return { response, user }
}
