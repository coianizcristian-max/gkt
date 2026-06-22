import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import PartiteLista from '@/app/components/PartiteLista'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function PartitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, permessi_collaboratore').eq('id', user?.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'
  if (profilo?.ruolo === 'staff' && !puoVisualizzare({ ruolo: profilo.ruolo, permessiCollaboratore: profilo.permessi_collaboratore }, 'partite')) {
    redirect('/dashboard')
  }

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let partite = []
  let categorie = []
  if (stagione) {
    let query = supabase.from('partite')
      .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
      .eq('stagione_id', stagione.id).order('data', { ascending: false })

    // Il portiere vede solo le partite della sua categoria
    if (isPortiere && profilo.portiere_id) {
      const { data: isc } = await supabase.from('iscrizioni')
        .select('squadra_id').eq('stagione_id', stagione.id).eq('portiere_id', profilo.portiere_id).maybeSingle()
      if (isc?.squadra_id) query = query.eq('squadra_id', isc.squadra_id)
    }

    const [pa, cat, vPar] = await Promise.all([
      query,
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('valutazioni_partita').select('partita_id').eq('presente', true),
    ])
    const partiteConVal = new Set((vPar.data ?? []).map((v) => v.partita_id))
    partite = (pa.data ?? []).map((p) => ({
      id: p.id, data: p.data, squadra_id: p.squadra_id, avversario: p.avversario,
      casa: p.casa, gol_fatti: p.gol_fatti, gol_subiti: p.gol_subiti,
      tipo: p.tipo ?? 'campionato', squadra_nome: p.squadre?.nome ?? '',
      ha_valutazioni: partiteConVal.has(p.id),
    }))
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Partite</h1>
        </div>
      </div>
      <div className="content">
        {!isPortiere && (
          <Guida titolo="Come usare le partite">
            Inserisci le gare con &ldquo;+ Nuova partita&rdquo;: data, categoria, avversario, casa/trasferta e risultato.
            Apri ogni partita per inserire le valutazioni dei portieri (voto, punti, note).
            Le amichevoli sono escluse dalle medie nelle statistiche: vengono conteggiate separatamente.
          </Guida>
        )}
        {stagione
          ? <PartiteLista partite={partite} categorie={categorie} isPortiere={isPortiere} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
