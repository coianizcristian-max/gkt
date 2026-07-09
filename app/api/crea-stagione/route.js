import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'))
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

  const { annoNome, societa, dataInizio, dataFine, categorie, renderAttiva = true } = await request.json()
  if (!annoNome) return NextResponse.json({ error: 'Anno mancante.' }, { status: 400 })

  const ownerId = await getOwnerId(supabase, user.id)

  // Non disattiviamo più le altre stagioni: possono restare "attiva" in
  // parallelo (una per club/società diversa). "renderAttiva" ora significa
  // "passa subito a lavorare su questa" (aggiorna solo il puntatore personale
  // di chi la crea), non più "disattiva tutte le altre".
  // 1. Crea la nuova stagione (sempre attiva: chi la crea la sta usando)
  const { data: stagione, error: stagErr } = await supabase
    .from('stagioni')
    .insert({
      nome: annoNome,
      societa_nome: societa || null,
      data_inizio: dataInizio || null,
      data_fine: dataFine || null,
      attiva: true,
      owner_id: ownerId,
    })
    .select('id')
    .single()

  if (stagErr) return NextResponse.json({ error: stagErr.message }, { status: 500 })

  // 2. Se richiesto, l'utente che la crea passa subito a lavorare su questa
  if (renderAttiva) {
    await supabase.from('profili').update({ stagione_corrente_id: stagione.id }).eq('id', user.id)
  }

  // 3. Crea le categorie
  if (Array.isArray(categorie) && categorie.length > 0) {
    for (let i = 0; i < categorie.length; i++) {
      const nomecat = categorie[i]?.trim()
      if (!nomecat) continue

      // Cerca o crea la squadra per questo owner
      let { data: squadra } = await supabase
        .from('squadre')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('nome', nomecat)
        .maybeSingle()

      if (!squadra) {
        const { data: nuova } = await supabase
          .from('squadre')
          .insert({ nome: nomecat, ordine: i + 1, owner_id: ownerId })
          .select('id')
          .single()
        squadra = nuova
      }

      if (squadra) {
        await supabase
          .from('stagione_categorie')
          .upsert({ stagione_id: stagione.id, squadra_id: squadra.id },
            { onConflict: 'stagione_id,squadra_id' })
      }
    }
  }

  return NextResponse.json({ ok: true, stagioneId: stagione.id })
}
