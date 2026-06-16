import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CalendarioMese from '@/app/components/CalendarioMese'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let allenamenti = []
  let categorie = []
  if (stagione) {
    const [al, cat] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, squadra_id, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    ])
    allenamenti = (al.data ?? []).map((a) => ({
      id: a.id, data: a.data, squadra_id: a.squadra_id, squadra_nome: a.squadre?.nome ?? '',
    }))
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)

    // Stato "valutato": un allenamento e' valutato se ha almeno una riga in valutazioni
    const allIds = allenamenti.map((a) => a.id)
    if (allIds.length) {
      const { data: vrows } = await supabase.from('valutazioni').select('allenamento_id').in('allenamento_id', allIds)
      const valutati = new Set((vrows ?? []).map((r) => r.allenamento_id))
      allenamenti = allenamenti.map((a) => ({ ...a, valutato: valutati.has(a.id) }))
    }
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Calendario</h1>
        </div>
        <Link href="/calendario/nuovo" className="btn-azione">+ Nuovo allenamento</Link>
      </div>
      <div className="content">
        {stagione
          ? <CalendarioMese allenamenti={allenamenti} categorie={categorie} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
