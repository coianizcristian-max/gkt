import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'

async function checkOwnership(supabase, id, ownerId) {
  const { data: stagione } = await supabase
    .from('stagioni').select('id, owner_id').eq('id', id).maybeSingle()
  if (!stagione || stagione.owner_id !== ownerId) return null
  return stagione
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

    const { data: profilo } = await supabase
      .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'))
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    const ownerId = await getOwnerId(supabase, user.id)
    if (!ownerId || !(await checkOwnership(supabase, id, ownerId)))
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    const { nome, societaNome, dataInizio, dataFine } = await request.json()
    if (!nome || !nome.trim())
      return NextResponse.json({ error: 'Il nome della stagione è obbligatorio.' }, { status: 400 })

    const { error: updErr } = await supabase.from('stagioni').update({
      nome: nome.trim(),
      societa_nome: societaNome?.trim() || null,
      data_inizio: dataInizio || null,
      data_fine: dataFine || null,
    }).eq('id', id)
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Errore imprevisto.' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

    const { data: profilo } = await supabase
      .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'))
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    const ownerId = await getOwnerId(supabase, user.id)
    if (!ownerId || !(await checkOwnership(supabase, id, ownerId)))
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    // Sicurezza: blocca l'eliminazione se la stagione contiene già dati reali
    // (allenamenti, partite o portieri iscritti). In quel caso l'utente deve
    // prima svuotarla (es. con "Eliminazione massiva") oppure contattarci.
    const [{ count: nAllenamenti }, { count: nPartite }, { count: nIscrizioni }] = await Promise.all([
      supabase.from('allenamenti').select('id', { count: 'exact', head: true }).eq('stagione_id', id),
      supabase.from('partite').select('id', { count: 'exact', head: true }).eq('stagione_id', id),
      supabase.from('iscrizioni').select('id', { count: 'exact', head: true }).eq('stagione_id', id),
    ])
    const totale = (nAllenamenti || 0) + (nPartite || 0) + (nIscrizioni || 0)
    if (totale > 0) {
      return NextResponse.json({
        error: `Non eliminabile: questa stagione contiene già ${nAllenamenti || 0} allenamenti, ${nPartite || 0} partite e ${nIscrizioni || 0} portieri iscritti. Rimuovili prima di eliminare la stagione.`,
      }, { status: 409 })
    }

    // Pulizia delle tabelle di supporto collegate alla stagione, poi la stagione stessa.
    await Promise.all([
      supabase.from('stagione_categorie').delete().eq('stagione_id', id),
      supabase.from('ricorrenze_stagionali').delete().eq('stagione_id', id),
      supabase.from('ricorrenze_partite_stagionali').delete().eq('stagione_id', id),
      supabase.from('squadre_avversarie').delete().eq('stagione_id', id),
      supabase.from('report_commenti').delete().eq('stagione_id', id),
      supabase.from('inviti').delete().eq('stagione_id', id),
    ])

    const { error: delErr } = await supabase.from('stagioni').delete().eq('id', id)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Errore imprevisto.' }, { status: 500 })
  }
}
