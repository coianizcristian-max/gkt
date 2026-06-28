import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { origin } = new URL(request.url)
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (_) {
    // ignora errori di signout, reindirizza comunque
  }
  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
