import { createClient } from '@/lib/supabase/server'
import PartiteLista from '@/app/components/PartiteLista'

export const dynamic = 'force-dynamic'

export default async function PartitePage() {
  const supabase = await createClient()
  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let partite = []
  let categorie = []
  if (stagione) {
    const [pa, cat] = await Promise.all([
      supabase.from('partite')
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data', { ascending: false }),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    ])
    partite = (pa.data ?? []).map((p) => ({
      id: p.id, data: p.data, squadra_id: p.squadra_id, avversario: p.avversario,
      casa: p.casa, gol_fatti: p.gol_fatti, gol_subiti: p.gol_subiti, squadra_nome: p.squadre?.nome ?? '',
    }))
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '\u2014'}</div>
          <h1>Partite</h1>
        </div>
      </div>
      <div className="content">
        {stagione
          ? <PartiteLista partite={partite} categorie={categorie} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
