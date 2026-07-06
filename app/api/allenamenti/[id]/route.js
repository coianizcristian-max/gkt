import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'
import { puoModificare } from '@/lib/permessi'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID mancante.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

    const { data: profilo } = await supabase
      .from('profili').select('ruolo, permessi_collaboratore').eq('id', user.id).maybeSingle()

    if (!puoModificare({ ruolo: profilo?.ruolo, permessiCollaboratore: profilo?.permessi_collaboratore }, 'allenamenti')) {
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })
    }

    const ownerId = await getOwnerId(supabase, user.id)
    if (!ownerId) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    const { data: allenamento } = await supabase
      .from('allenamenti').select('id, stagione_id').eq('id', id).maybeSingle()
    if (!allenamento) return NextResponse.json({ error: 'Allenamento non trovato.' }, { status: 404 })

    const { data: stagione } = await supabase
      .from('stagioni').select('id').eq('id', allenamento.stagione_id).eq('owner_id', ownerId).maybeSingle()
    if (!stagione) return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 })

    const { error: delErr } = await supabase.from('allenamenti').delete().eq('id', id)
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message ?? 'Errore imprevisto.' }, { status: 500 })
  }
}
