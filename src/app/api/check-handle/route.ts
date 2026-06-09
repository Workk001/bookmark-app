import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const handle = searchParams.get('handle')?.trim()

  if (!handle) {
    return NextResponse.json(
      { error: 'Handle query parameter is required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient(true)

  const { data, error } = await supabase
    .from('profiles')
    .select('handle')
    .eq('handle', handle)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'Unable to check handle availability.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ available: !data })
}
