import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'
import CalendarioMese from '@/app/components/CalendarioMese'
import Guida from '@/app/components/Guida'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let allenamenti = []
  let partite = []
  let categorie = []

  if (stagione) {
    const [al, cat, par] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, squadra_id, ora_inizio, ora_fine, accorpata_con, nessuna_valutazione, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('partite')
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
    ])

    const catMap = {}
    for (const r of cat.data ?? []) {
      if (r.squadre) catMap[r.squadre.id] = r.squadre.nome
    }

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
    }))

    if (!isPortiere) {
      const partIds = partite.map((p) => p.id)
      let partiteValutate = new Set()
      if (partIds.length) {
        const { data: vprows } = await supabase.from('valutazioni_partita')
          .select('partita_id').not('voto', 'is', null).in('partita_id', partIds)
        partiteValutate = new Set((vprows ?? []).map((r) => r.partita_id))
      }
      partite = partite.map((p) => ({ ...p, ha_valutazioni: partiteValutate.has(p.id) }))
    }

    allenamenti = (al.data ?? []).map((a) => ({
      id: a.id,
      data: a.data,
      squadra_id: a.squadra_id,
      squadra_nome: a.squadra?.nome ?? '',
      ora_inizio: a.ora_inizio ?? null,
      ora_fine: a.ora_fine ?? null,
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
            <p>
              Clicca sul <strong>numero del giorno</strong> per creare un nuovo allenamento in quella data.
              Gli allenamenti in <b style={{color:'#2e9e5b'}}>verde</b> sono già valutati, in <b style={{color:'#c0392b'}}>rosso</b> sono da valutare.
              Le partite appaiono in <b style={{color:'#7c3aed'}}>viola</b>: scuro se già passate, chiaro se future. Clicca su qualsiasi blocco per aprirlo.
            </p>
            <p style={{marginTop:10}}>
              Dall&apos;interno di un allenamento puoi: segnare le presenze, inserire voto e punteggi per parametro per ogni portiere,
              aggiungere gli esercizi della seduta, e attivare il flag <strong>&ldquo;Nessuna valutazione&rdquo;</strong> se l&apos;allenamento
              si è svolto ma non vuoi inserire voti (in questo caso appare comunque come verde/valutato nel calendario).
              Puoi anche <strong>accorpare</strong> due categorie in un unico allenamento condiviso direttamente dal form.
            </p>
            <p style={{marginTop:10}}>
              Per <strong>eliminare più allenamenti o partite in blocco</strong> usa la sezione
              {' '}<a href="/ricorrenze" className="link-inline">Ricorrenze → Eliminazione massiva</a>,
              dove puoi filtrare per categoria, intervallo di date e presenza o assenza di valutazioni.
            </p>
          </Guida>
        )}
        {stagione
          ? <CalendarioMese allenamenti={allenamenti} partite={partite} categorie={categorie} vista={isPortiere ? 'portiere' : 'staff'} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
