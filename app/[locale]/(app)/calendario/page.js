import { createClient, getUser } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'
import CalendarioMese from '@/app/components/CalendarioMese'
import CalendarioPortiereTabs from '@/app/components/CalendarioPortiereTabs'
import CalendarioAzioni from '@/app/components/CalendarioAzioni'
import Guida from '@/app/components/Guida'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const t = await getTranslations('calendario')
  const c = await getTranslations('common')
  const user = await getUser()

  // profilo e stagione dipendono solo da user.id, non l'uno dall'altro: nessun
  // redirect qui li separa (a differenza di dashboard/ricorrenze), quindi si
  // possono lanciare insieme senza rischi.
  const [{ data: profilo }, { db, stagione, taglio, oggi: oggiCtx }] = await Promise.all([
    supabase.from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle(),
    contestoDati(supabase, user?.id),
  ])
  const isPortiere = profilo?.ruolo === 'portiere'

  let allenamenti = []
  let partite = []
  let categorie = []

  if (stagione) {
    // Per un PORTIERE il calendario deve mostrare SOLO gli eventi delle sue
    // squadre (categoria): le ricaviamo dalle iscrizioni. Staff/allenatore
    // vedono tutto (squadrePortiere resta null).
    let squadrePortiere = null
    if (isPortiere && profilo?.portiere_id) {
      const { data: iscrPort } = await db.from('iscrizioni')
        .select('squadra_id').eq('portiere_id', profilo.portiere_id).eq('stagione_id', stagione.id)
      squadrePortiere = [...new Set((iscrPort ?? []).map((r) => r.squadra_id).filter(Boolean))]
    }
    const soloSueSquadre = (q) => squadrePortiere
      ? q.in('squadra_id', squadrePortiere.length ? squadrePortiere : ['00000000-0000-0000-0000-000000000000'])
      : q

    const [al, cat, par] = await Promise.all([
      soloSueSquadre(db.from('allenamenti')
        .select('id, data, squadra_id, ora_inizio, ora_fine, accorpata_con, nessuna_valutazione, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id)).order('data'),
      db.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      soloSueSquadre(db.from('partite')
        .select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, tipo, ora_ritrovo, ora_inizio, squadre(nome)')
        .eq('stagione_id', stagione.id)).order('data'),
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
      // dopo la data di riferimento la partita non e' ancora stata giocata
      gol_fatti: entroTaglio(p.data, taglio) ? p.gol_fatti : null,
      gol_subiti: entroTaglio(p.data, taglio) ? p.gol_subiti : null,
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
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean)
      .filter((s) => !squadrePortiere || squadrePortiere.includes(s.id))
      .sort((a, b) => a.ordine - b.ordine)

    const partIds = partite.map((p) => p.id)
    const allIds = allenamenti.map((a) => a.id)
    // In demo le sedute e le partite dopo la data di taglio restano a calendario
    // ma non hanno valutazioni: si vede la stagione compilata fino a quel giorno.
    const partIdsVal = taglio ? partite.filter((p) => entroTaglio(p.data, taglio)).map((p) => p.id) : partIds
    const allIdsVal = taglio ? allenamenti.filter((a) => entroTaglio(a.data, taglio)).map((a) => a.id) : allIds

    // Query indipendenti (partite dello staff / allenamenti valutati): prima
    // giravano una dopo l'altra, ora in parallelo.
    const [vprowsRes, vRes] = await Promise.all([
      (!isPortiere && partIdsVal.length)
        ? db.from('valutazioni_partita').select('partita_id').not('voto', 'is', null).in('partita_id', partIdsVal)
        : Promise.resolve({ data: [] }),
      isPortiere
        ? ((allIdsVal.length && profilo?.portiere_id)
          ? db.from('valutazioni').select('allenamento_id, presente, voto_portiere, voto, note').eq('portiere_id', profilo.portiere_id).in('allenamento_id', allIdsVal)
          : Promise.resolve({ data: [] }))
        : (allIdsVal.length
          ? db.from('valutazioni').select('allenamento_id').not('voto', 'is', null).in('allenamento_id', allIdsVal)
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
        presente: byAll[a.id]?.presente ?? null,
        ha_voto: byAll[a.id]?.voto_portiere != null,
        voto_portiere: byAll[a.id]?.voto_portiere ?? null,
        valutato_coach: (byAll[a.id]?.voto != null) || !!a.nessuna_valutazione,
        voto_coach: byAll[a.id]?.voto ?? null,
        note_coach: byAll[a.id]?.note ?? null,
      }))
    } else {
      const valutati = new Set((vRes.data ?? []).map((r) => r.allenamento_id))
      allenamenti = allenamenti.map((a) => ({ ...a, valutato: valutati.has(a.id) || a.nessuna_valutazione }))
    }

    // Assenti annunciati per allenamenti E partite (solo staff): informativo, mai in statistiche/presenze.
    if (!isPortiere && (allenamenti.length || partite.length)) {
      const { data: iscr } = await db.from('iscrizioni')
        .select('id, squadra_id, portieri(nome, cognome)')
        .eq('stagione_id', stagione.id)
      const iscrIds = (iscr ?? []).map((i) => i.id)
      let assenze = []
      if (iscrIds.length) {
        const { data: ap } = await db.from('assenze_previste')
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

  const oggiStr = oggiCtx

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">{c('stagione', { nome: stagione?.nome ?? '—' })}</div>
          <h1>{t('titolo')}</h1>
        </div>
        {!isPortiere && <CalendarioAzioni />}
      </div>
      <div className="content">
        {!isPortiere && (
          <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong>, verde: (ch) => <b style={{color:'#2e9e5b'}}>{ch}</b>, rosso: (ch) => <b style={{color:'#c0392b'}}>{ch}</b>, viola: (ch) => <b style={{color:'#7c3aed'}}>{ch}</b> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong>, ricorrenze: (ch) => <a href="/ricorrenze" className="link-inline">{ch}</a> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        )}
        {stagione
          ? (isPortiere
            ? <CalendarioPortiereTabs allenamenti={allenamenti} partite={partite} categorie={categorie} oggiStr={oggiStr} />
            : <CalendarioMese allenamenti={allenamenti} partite={partite} categorie={categorie} vista="staff" oggiIso={oggiStr} />)
          : <div className="empty">{c('nessunaStagione')}</div>}
      </div>
    </>
  )
}
