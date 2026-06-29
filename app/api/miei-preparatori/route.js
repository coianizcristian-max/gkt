import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/miei-preparatori
// Restituisce la lista dei preparatori collegati al responsabile loggato
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    // Verifica ruolo allenatore
    const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    if (profilo?.ruolo !== 'allenatore') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    const admin = getAdmin()

    // Leggi tutte le relazioni in cui questo utente è supervisore
    const { data: relazioni, error: relErr } = await admin
      .from('relazioni_supervisione')
      .select('id, preparatore_id, attivo, created_at, revocato_il')
      .eq('supervisore_id', user.id)
      .order('created_at', { ascending: false })

    if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 })
    if (!relazioni || relazioni.length === 0) return NextResponse.json({ preparatori: [] })

    // Leggi i profili dei preparatori
    const ids = relazioni.map(r => r.preparatore_id)
    const { data: profili } = await admin
      .from('profili')
      .select('id, nome_completo, foto_url, citta')
      .in('id', ids)

    // Leggi la stagione attiva di ciascun preparatore
    const { data: stagioni } = await admin
      .from('stagioni')
      .select('id, nome, owner_id, stagione_corrente')
      .in('owner_id', ids)
      .eq('stagione_corrente', true)

    // Assembla il risultato
    const preparatori = relazioni.map(rel => {
      const p = profili?.find(x => x.id === rel.preparatore_id) ?? {}
      const s = stagioni?.find(x => x.owner_id === rel.preparatore_id) ?? null
      return {
        relazione_id: rel.id,
        preparatore_id: rel.preparatore_id,
        attivo: rel.attivo,
        collegato_il: rel.created_at,
        revocato_il: rel.revocato_il,
        nome_completo: p.nome_completo ?? '(nessun nome)',
        foto_url: p.foto_url ?? null,
        citta: p.citta ?? null,
        stagione_attiva: s ? { id: s.id, nome: s.nome } : null,
      }
    })

    return NextResponse.json({ preparatori })

  } catch (err) {
    console.error('miei-preparatori error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
