import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consumaInvito } from '@/lib/consumaInvito'

// La logica vera sta in lib/consumaInvito.js (condivisa con /auth/callback).
// Qui verifichiamo solo che chi chiama sia autenticato e passiamo il SUO
// utente: così l'invito viene sempre applicato all'account loggato che fa
// la richiesta, mai a un altro.
export async function POST(request) {
  try {
    const { token } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await consumaInvito(token, user)
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status })
    }
    return NextResponse.json({ ok: true, tipo: res.tipo })
  } catch (err) {
    console.error('consuma-invito route error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
