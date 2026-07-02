import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaywallBanner from '@/app/components/PaywallBanner'
import PercorsoTimeline from '@/app/components/PercorsoTimeline'
import ReportStagione from '@/app/components/ReportStagione'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function PercorsoCrescitaPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  // Riusa lo stesso gate delle statistiche/obiettivi: è una vista derivata da entrambi
  const canVedere = isUnlocked('statistiche_dettaglio', gatingCfg, abbAttivo) && isUnlocked('obiettivi_portieri', gatingCfg, abbAttivo)
  const canReport = isUnlocked('report_pdf_stagione', gatingCfg, abbAttivo)

  const navLinks = (
    <div className="sub-nav">
      <Link href={`/portieri/${id}`} className="sub-nav-link">Scheda</Link>
      <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">Obiettivi</Link>
      <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link">Statistiche</Link>
      <Link href={`/portieri/${id}/percorso`} className="sub-nav-link active">Percorso</Link>
    </div>
  )

  if (!canVedere) {
    return (
      <>
        <div className="topbar">
          <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>}</div>
          <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
        </div>
        <div className="content">
          {navLinks}
          <PaywallBanner chiave="statistiche_dettaglio" label="Percorso di crescita" />
        </div>
      </>
    )
  }

  // ── Raccoglie gli eventi della timeline ──────────────────────────────────
  const eventi = []

  // 1. Obiettivi: creazione e raggiungimento
  const { data: obiettivi } = await supabase.from('obiettivi')
    .select('id, titolo, categoria, stato, created_at, updated_at').eq('portiere_id', id)
  for (const o of obiettivi ?? []) {
    eventi.push({ tipo: 'obiettivo_creato', data: o.created_at?.slice(0, 10), titolo: o.titolo, categoria: o.categoria })
    if (o.stato === 'raggiunto' && o.updated_at) {
      eventi.push({ tipo: 'obiettivo_raggiunto', data: o.updated_at.slice(0, 10), titolo: o.titolo, categoria: o.categoria })
    }
  }

  // 2. Allenamenti: voti particolarmente alti (≥8) o bassi (≤4) come momenti notevoli
  if (stagione) {
    const { data: allenamenti } = await supabase.from('allenamenti')
      .select('id, data, squadra:squadre!allenamenti_squadra_id_fkey(nome)').eq('stagione_id', stagione.id)
    const allenById = {}
    for (const a of allenamenti ?? []) allenById[a.id] = a

    const { data: valutazioni } = await supabase.from('valutazioni')
      .select('allenamento_id, voto, presente').eq('portiere_id', id).eq('presente', true).not('voto', 'is', null)
    for (const v of valutazioni ?? []) {
      const voto = Number(v.voto)
      const allen = allenById[v.allenamento_id]
      if (!allen) continue
      if (voto >= 8) eventi.push({ tipo: 'voto_alto', data: allen.data, titolo: `Ottimo allenamento — voto ${voto}`, dettaglio: allen.squadra?.nome })
      if (voto <= 4) eventi.push({ tipo: 'voto_basso', data: allen.data, titolo: `Allenamento difficile — voto ${voto}`, dettaglio: allen.squadra?.nome })
    }

    // 3. Partite giocate con esito
    const { data: partite } = await supabase.from('partite')
      .select('id, data, avversario, gol_fatti, gol_subiti, tipo').eq('stagione_id', stagione.id)
    const partiteById = {}
    for (const p of partite ?? []) partiteById[p.id] = p
    const { data: valPartite } = await supabase.from('valutazioni_partita')
      .select('partita_id, voto, presente').eq('portiere_id', id).eq('presente', true)
    for (const v of valPartite ?? []) {
      const p = partiteById[v.partita_id]
      if (!p) continue
      const cs = p.gol_subiti === 0
      eventi.push({
        tipo: cs ? 'clean_sheet' : 'partita',
        data: p.data,
        titolo: cs ? `Clean sheet vs ${p.avversario || '—'}` : `Partita vs ${p.avversario || '—'}${v.voto ? ` — voto ${v.voto}` : ''}`,
        dettaglio: p.tipo,
      })
    }
  }

  eventi.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))

  const { data: commentoRow } = stagione
    ? await supabase.from('report_commenti')
        .select('commento_allenatore, commento_portiere')
        .eq('portiere_id', id).eq('stagione_id', stagione.id).maybeSingle()
    : { data: null }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {navLinks}
        <PercorsoTimeline eventi={eventi} />
        {stagione && (
          <ReportStagione
            portiereId={id}
            stagioneId={stagione.id}
            soloPortiere={soloPortiere}
            commentoIniziale={{ allenatore: commentoRow?.commento_allenatore, portiere: commentoRow?.commento_portiere }}
            canReport={canReport}
          />
        )}
      </div>
    </>
  )
}
