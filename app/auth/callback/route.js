import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    // Scambio fallito (tipico: link di conferma aperto in un browser diverso
    // da quello usato per registrarsi). L'email risulta comunque già
    // confermata lato server: mostriamo comunque la pagina di conferma,
    // che inviterà ad accedere invece che all'area riservata.
    if (next === '/benvenuto') return NextResponse.redirect(`${origin}/benvenuto`)
  }
  return NextResponse.redirect(`${origin}/login`)
}
