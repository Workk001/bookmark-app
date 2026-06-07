import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle')

  if (!handle || !/^[a-zA-Z0-9_]+$/.test(handle)) {
    return NextResponse.json(
      { error: 'Invalid handle format.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('handle', handle)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
