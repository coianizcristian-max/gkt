import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CalendarioMese from '@/app/components/CalendarioMese'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let allenamenti = []
  let categorie = []
  if (stagione) {
    const [al, cat] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, squadra_id, nessuna_valutazione, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    ])
    allenamenti = (al.data ?? []).map((a) => ({
      id: a.id, data: a.data, squadra_id: a.squadra_id, squadra_nome: a.squadre?.nome ?? '',
      nessuna_valutazione: a.nessuna_valutazione,
    }))
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)

    const allIds = allenamenti.map((a) => a.id)
    if (isPortiere) {
      // Per il portiere: stato presenza + se ha gia' lasciato il voto, per allenamento
      let mie = []
      if (allIds.length && profilo?.portiere_id) {
        const { data } = await supabase.from('valutazioni')
          .select('allenamento_id, presente, voto_portiere')
          .eq('portiere_id', profilo.portiere_id).in('allenamento_id', allIds)
        mie = data ?? []
      }
      const byAll = {}
      for (const v of mie) byAll[v.allenamento_id] = v
      allenamenti = allenamenti.map((a) => ({
        ...a,
        presente: byAll[a.id]?.presente ?? false,
        ha_voto: byAll[a.id]?.voto_portiere != null,
      }))
    } else {
      // Staff: "valutato" = almeno un voto reale, oppure allenamento segnato "Nessuno"
      let valutati = new Set()
      if (allIds.length) {
        const { data: vrows } = await supabase.from('valutazioni')
          .select('allenamento_id').not('voto', 'is', null).in('allenamento_id', allIds)
        valutati = new Set((vrows ?? []).map((r) => r.allenamento_id))
      }
      allenamenti = allenamenti.map((a) => ({ ...a, valutato: valutati.has(a.id) || a.nessuna_valutazione }))
    }
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Calendario</h1>
        </div>
        {!isPortiere && <Link href="/calendario/nuovo" className="btn-azione">+ Nuovo allenamento</Link>}
      </div>
      <div className="content">
        {stagione
          ? <CalendarioMese allenamenti={allenamenti} categorie={categorie} vista={isPortiere ? 'portiere' : 'staff'} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}