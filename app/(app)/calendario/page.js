import { createClient, getUser } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'
import CalendarioMese from '@/app/components/CalendarioMese'
import CalendarioAzioni from '@/app/components/CalendarioAzioni'
import Guida from '@/app/components/Guida'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const user = await getUser()

  // profilo e stagione dipendono solo da user.id, non l'uno dall'altro: nessun
  // redirect qui li separa (a differenza di dashboard/ricorrenze), quindi si
  // possono lanciare insieme senza rischi.
  const [{ data: profilo }, { stagione }] = await Promise.all([
    supabase.from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle(),
    getStagioneAttiva(supabase, user?.id),
  ])
  const isPortiere = profilo?.ruolo === 'portiere'

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
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, ora_ritrovo, ora_inizio, squadre(nome)')
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
      ora_ritrovo: p.ora_ritrovo ?? null,
      ora_inizio: p.ora_inizio ?? null,
      _tipo: 'partita',
    }))

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

    const partIds = partite.map((p) => p.id)
    const allIds = allenamenti.map((a) => a.id)

    // Query indipendenti (partite dello staff / allenamenti valutati): prima
    // giravano una dopo l'altra, ora in parallelo.
    const [vprowsRes, vRes] = await Promise.all([
      (!isPortiere && partIds.length)
        ? supabase.from('valutazioni_partita').select('partita_id').not('voto', 'is', null).in('partita_id', partIds)
        : Promise.resolve({ data: [] }),
      isPortiere
        ? ((allIds.length && profilo?.portiere_id)
          ? supabase.from('valutazioni').select('allenamento_id, presente, voto_portiere').eq('portiere_id', profilo.portiere_id).in('allenamento_id', allIds)
          : Promise.resolve({ data: [] }))
        : (allIds.length
          ? supabase.from('valutazioni').select('allenamento_id').not('voto', 'is', null).in('allenamento_id', allIds)
          : Promise.resolve({ data: [] })),
    ])

    if (!isPortiere) {
      const partiteValutate = new Set((vprowsRes.data ?? []).map((r) => r.partita_id))
      partite = partite.map((p) => ({ ...p, ha_valutazioni: partiteValutate.has(p.id) }))
    }

    if (isPortiere) {
      const mie = vRes.data ?? []
      const byAll = {}
      for (const v of mie) byAll[v.allenamento_id] = v
      allenamenti = allenamenti.map((a) => ({
        ...a,
        presente: byAll[a.id]?.presente ?? false,
        ha_voto: byAll[a.id]?.voto_portiere != null,
      }))
    } else {
      const valutati = new Set((vRes.data ?? []).map((r) => r.allenamento_id))
      allenamenti = allenamenti.map((a) => ({ ...a, valutato: valutati.has(a.id) || a.nessuna_valutazione }))
    }

    // Assenti annunciati per allenamenti E partite (solo staff): informativo, mai in statistiche/presenze.
    if (!isPortiere && (allenamenti.length || partite.length)) {
      const { data: iscr } = await supabase.from('iscrizioni')
        .select('id, squadra_id, portieri(nome, cognome)')
        .eq('stagione_id', stagione.id)
      const iscrIds = (iscr ?? []).map((i) => i.id)
      let assenze = []
      if (iscrIds.length) {
        const { data: ap } = await supabase.from('assenze_previste')
          .select('iscrizione_id, data_inizio, data_fine, nota')
          .in('iscrizione_id', iscrIds)
        assenze = ap ?? []
      }
      const iscrById = new Map((iscr ?? []).map((i) => [i.id, i]))
      const assExp = assenze.map((a) => {
        const i = iscrById.get(a.iscrizione_id)
        const pt = i?.portieri
        return {
          squadra_id: i?.squadra_id ?? null,
          nome: pt ? `${pt.nome ?? ''} ${pt.cognome ?? ''}`.trim() : 'Portiere',
          nota: a.nota ?? null,
          dal: a.data_inizio,
          al: a.data_fine ?? a.data_inizio,
        }
      })
      const assentiPer = (data, cats) => assExp
        .filter((x) => cats.includes(x.squadra_id) && x.dal <= data && x.al >= data)
        .map((x) => ({ nome: x.nome, nota: x.nota }))
      allenamenti = allenamenti.map((a) => ({
        ...a,
        assenti_annunciati: assentiPer(a.data, [a.squadra_id, a.accorpata_con].filter(Boolean)),
      }))
      partite = partite.map((p) => ({
        ...p,
        assenti_annunciati: assentiPer(p.data, [p.squadra_id].filter(Boolean)),
      }))
    }
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Calendario</h1>
        </div>
        {!isPortiere && <CalendarioAzioni />}
      </div>
      <div className="content">
        {!isPortiere && (
          <Guida titolo="Come usare il calendario">
            <p>
              Clicca sul <strong>numero del giorno</strong> per creare un nuovo allenamento in quella data. Puoi anche <strong>selezionare un giorno qualsiasi</strong> (anche vuoto): i pulsanti <strong>+ Nuovo allenamento</strong> e <strong>+ Nuova partita</strong> in alto useranno quella data.
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
          <p style={{marginTop:10}}>
            Cliccando un giorno, nella preview vedi anche gli <strong>assenti annunciati</strong> (portieri con un&apos;assenza programmata su quella data) e, per le partite, gli <strong>orari di ritrovo e inizio</strong>. Nella griglia di valutazione di un allenamento puoi inoltre segnare gli <strong>infortuni</strong>, poi esclusi dalle statistiche.
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
