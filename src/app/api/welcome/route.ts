import { NextResponse } from 'next/server'

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

  const apiKey = process.env.MAILERSEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email service is not configured.' },
      { status: 500 },
    )
  }

  const senderEmail =
    process.env.MAILERSEND_FROM_EMAIL || 'MS_sender@trial-xxxxx.mlsender.net'

  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: senderEmail },
      to: [{ email }],
      subject: 'Welcome to Bookmarks App',
      html: `
        <h1>Welcome, @${handle}!</h1>
        <p>Your Bookmarks App account is ready.</p>
        <p>You can now save private bookmarks and publish selected links on your public profile.</p>
      `,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('MailerSend API error:', res.status, errorBody)
    return NextResponse.json(
      { error: 'Failed to send welcome email.', details: errorBody },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
