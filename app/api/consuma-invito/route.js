import { NextResponse } from 'next/server'
import { tApi } from '@/lib/i18nServer'
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
      // `esaurito` = l'invito non esiste più o è già stato consumato: il token
      // nei metadati non servirà mai più, il chiamante può azzerarlo.
      return NextResponse.json(
        { error: res.error, esaurito: res.esaurito === true },
        { status: res.status }
      )
    }
    return NextResponse.json({ ok: true, tipo: res.tipo })
  } catch (err) {
    console.error('consuma-invito route error:', err)
    return NextResponse.json({ error: tApi(request, 'Errore interno') }, { status: 500 })
  }
}
