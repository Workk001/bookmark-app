import { NextResponse } from 'next/server'

import { resend } from '@/lib/resend'

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string
    handle?: string
  }

  const email = body.email?.trim()
  const handle = body.handle?.trim()

  if (!email || !handle) {
    return NextResponse.json(
      { error: 'Email and handle are required.' },
      { status: 400 },
    )
  }

  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Welcome to Bookmarks App',
    html: `
      <h1>Welcome, @${handle}</h1>
      <p>Your Bookmarks App account is ready.</p>
      <p>You can now save private bookmarks and publish selected links on your public profile.</p>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
