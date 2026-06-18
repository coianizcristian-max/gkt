import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CalendarioMese from '@/app/components/CalendarioMese'
import Guida from '@/app/components/Guida'

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
        .select('id, data, squadra_id, accorpata_con, nessuna_valutazione, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    ])

    // Mappa id → nome per le categorie (per tooltip accorpamento)
    const catMap = {}
    for (const r of cat.data ?? []) {
      if (r.squadre) catMap[r.squadre.id] = r.squadre.nome
    }

    allenamenti = (al.data ?? []).map((a) => ({
      id: a.id,
      data: a.data,
      squadra_id: a.squadra_id,
      squadra_nome: a.squadre?.nome ?? '',
      accorpata_con: a.accorpata_con ?? null,
      accorpata_nome: a.accorpata_con ? (catMap[a.accorpata_con] ?? '') : null,
      nessuna_valutazione: a.nessuna_valutazione,
    }))
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)

    const allIds = allenamenti.map((a) => a.id)
    if (isPortiere) {
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
        {!isPortiere && (
          <Guida titolo="Come usare il calendario">
            Clicca su un numero del giorno per creare un allenamento in quella data. Clicca su un allenamento per aprirlo e inserire presenze e valutazioni.
            Gli allenamenti con cornice gialla sono accorpati con un&apos;altra categoria. Usa il filtro in alto a destra per vedere una sola categoria.
            La sezione &ldquo;Da valutare&rdquo; mostra gli allenamenti passati senza valutazioni inserite.
          </Guida>
        )}
        {stagione
          ? <CalendarioMese allenamenti={allenamenti} categorie={categorie} vista={isPortiere ? 'portiere' : 'staff'} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
