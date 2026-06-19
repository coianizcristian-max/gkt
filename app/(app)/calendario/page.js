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
  let partite = []
  let categorie = []

  if (stagione) {
    const [al, cat, par, valPar] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, squadra_id, accorpata_con, nessuna_valutazione, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('partite')
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('valutazioni_partita').select('partita_id').eq('presente', true),
    ])

    const catMap = {}
    for (const r of cat.data ?? []) {
      if (r.squadre) catMap[r.squadre.id] = r.squadre.nome
    }

    const partiteConVal = new Set((valPar.data ?? []).map((v) => v.partita_id))

    partite = (par.data ?? []).map((p) => ({
      id: p.id,
      data: p.data,
      squadra_id: p.squadra_id,
      squadra_nome: p.squadre?.nome ?? '',
      avversario: p.avversario ?? '',
      casa: p.casa,
      tipo: p.tipo ?? 'campionato',
      gol_fatti: p.gol_fatti,
      gol_subiti: p.gol_subiti,
      _tipo: 'partita',
      ha_valutazioni: partiteConVal.has(p.id),
    }))

    allenamenti = (al.data ?? []).map((a) => ({
      id: a.id,
      data: a.data,
      squadra_id: a.squadra_id,
      squadra_nome: a.squadra?.nome ?? '',
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
            Clicca su un numero del giorno per creare un allenamento. Gli allenamenti in <b style={{color:'#2e9e5b'}}>verde</b> sono valutati, in <b style={{color:'#c0392b'}}>rosso</b> da valutare.
            Le partite appaiono in <b style={{color:'#7c3aed'}}>viola</b>: scuro se passate, chiaro se future. Cliccaci sopra per aprirle.
          </Guida>
        )}
        {stagione
          ? <CalendarioMese allenamenti={allenamenti} partite={partite} categorie={categorie} vista={isPortiere ? 'portiere' : 'staff'} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
