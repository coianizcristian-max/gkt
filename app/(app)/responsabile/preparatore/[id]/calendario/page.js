import { createClient as createAdminClient } from '@supabase/supabase-js'
import CalendarioMeseSupervisione from '@/app/components/CalendarioMeseSupervisione'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneCalendario({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()
  const basePath = `/responsabile/preparatore/${preparatoreId}`

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  let allenamenti = [], partite = [], categorie = []
  if (stagione) {
    const oggi = new Date().toISOString().slice(0, 10)
    const [{ data: all }, { data: par }, { data: cat }, { data: vals }, { data: vpar }] = await Promise.all([
      admin.from('allenamenti')
        .select('id, data, squadra_id, accorpata_con, nessuna_valutazione, ora_inizio, ora_fine, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id),
      admin.from('partite')
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id),
      admin.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      admin.from('valutazioni').select('allenamento_id').eq('allenamento_id', null), // placeholder
      admin.from('valutazioni_partita').select('partita_id').eq('presente', true),
    ])

    // Calcola allenamenti valutati
    const allenIds = (all ?? []).map(a => a.id)
    let valMap = {}
    if (allenIds.length > 0) {
      const { data: vv } = await admin
        .from('valutazioni')
        .select('allenamento_id, voto')
        .in('allenamento_id', allenIds)
        .not('voto', 'is', null)
      for (const v of vv ?? []) valMap[v.allenamento_id] = true
    }

    // Partite con valutazioni
    const partIds = (par ?? []).map(p => p.id)
    let partValSet = new Set()
    if (partIds.length > 0) {
      const { data: vpRows } = await admin
        .from('valutazioni_partita')
        .select('partita_id')
        .in('partita_id', partIds)
        .eq('presente', true)
      for (const v of vpRows ?? []) partValSet.add(v.partita_id)
    }

    allenamenti = (all ?? []).map(a => ({
      ...a,
      squadra_nome: a.squadra?.nome ?? '',
      valutato: !!valMap[a.id],
      accorpata_nome: null,
    }))

    partite = (par ?? []).map(p => ({
      ...p,
      squadra_nome: p.squadre?.nome ?? '',
      ha_valutazioni: partValSet.has(p.id),
    }))

    categorie = (cat ?? []).map(r => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{stagione?.nome ?? '—'}</div>
        <h1>Calendario</h1>
      </div>
      <div className="content">
        {!stagione
          ? <div className="empty">Nessuna stagione attiva.</div>
          : <CalendarioMeseSupervisione
              allenamenti={allenamenti}
              partite={partite}
              categorie={categorie}
              basePath={basePath}
              preparatoreId={preparatoreId}
            />
        }
      </div>
    </>
  )
}
