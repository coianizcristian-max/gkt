import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaywallBanner from '@/app/components/PaywallBanner'
import StatisticheGrafici from '@/app/components/StatisticheGrafici'
import IndiceCrescita from '@/app/components/IndiceCrescita'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { calcolaIndiceCrescita } from '@/lib/indiceCrescita'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

const fmt = (n, dec = 2) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec }))

export default async function StatistichePortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  const { data: portiere } = await supabase.from('portieri')
    .select('id, nome, cognome, data_nascita').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { stagione } = await getStagioneAttiva(supabase, user?.id)
  const { data: iscrizione } = stagione
    ? await supabase.from('iscrizioni')
        .select('id, squadra_id, squadre(nome)')
        .eq('stagione_id', stagione.id).eq('portiere_id', id).maybeSingle()
    : { data: null }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canStat = isUnlocked('statistiche_dettaglio', gatingCfg, abbAttivo)

  const navLinks = (
    <div className="sub-nav">
      <Link href={`/portieri/${id}`} className="sub-nav-link">Scheda</Link>
      <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">Obiettivi</Link>
      <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link active">Statistiche</Link>
    </div>
  )

  if (!canStat) {
    return (
      <>
        <div className="topbar">
          <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
          <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
        </div>
        <div className="content">
          {navLinks}
          <div className="scheda" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%)', border: '1px solid #b8d9f5' }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              Le statistiche dettagliate includono 7 grafici interattivi: andamento voti allenamenti/partite, gol subiti progressivi, presenze comparative, analisi per caratteristica tecnica e molto altro.
            </p>
          </div>
          <PaywallBanner chiave="statistiche_dettaglio" label="Statistiche dettaglio portiere" />
        </div>
      </>
    )
  }

  // ── Carica tutti i dati ─────────────────────────────────────────────────
  let vAll = [], vPar = [], punteggi = [], parametri = []
  let partiteRows = []

  if (stagione) {
    const { data: allenamenti } = await supabase.from('allenamenti')
      .select('id, data, squadra_id').eq('stagione_id', stagione.id).lt('data', new Date().toISOString().slice(0, 10)).order('data')
    const allenIds = (allenamenti ?? []).map((a) => a.id)
    const allenByDate = {}
    for (const a of allenamenti ?? []) allenByDate[a.id] = a.data

    // Partite con gol_subiti (campo della tabella partite, non valutazioni_partita)
    const { data: par } = await supabase.from('partite')
      .select('id, data, tipo, gol_subiti, gol_fatti, avversario, casa')
      .eq('stagione_id', stagione.id).lt('data', new Date().toISOString().slice(0, 10)).order('data')
    partiteRows = par ?? []
    const partIds = partiteRows.map((p) => p.id)
    const partiteByID = {}
    for (const p of partiteRows) partiteByID[p.id] = p

    const [va, vp, pm] = await Promise.all([
      allenIds.length
        ? supabase.from('valutazioni')
            .select('allenamento_id, presente, voto')
            .eq('portiere_id', id).in('allenamento_id', allenIds)
        : Promise.resolve({ data: [] }),
      partIds.length
        ? supabase.from('valutazioni_partita')
            .select('partita_id, presente, voto, punti')
            .eq('portiere_id', id).in('partita_id', partIds)
        : Promise.resolve({ data: [] }),
      supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    ])

    vAll = (va.data ?? []).map((v) => ({ ...v, data: allenByDate[v.allenamento_id] }))
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    // Infortuni del portiere in stagione: marca le sessioni cadute in un periodo di stop
    let _infortuni = []
    if (iscrizione?.id) {
      const { data: _inf } = await supabase.from('infortuni')
        .select('data_inizio, data_fine').eq('iscrizione_id', iscrizione.id)
      _infortuni = _inf ?? []
    }
    const _inInfortunio = (d) => !!d && _infortuni.some((w) => w.data_inizio <= d && (w.data_fine == null || w.data_fine >= d))
    vAll = vAll.map((v) => ({ ...v, infortunato: _inInfortunio(v.data) }))
    // Unisce valutazioni_partita con i dati di partite (gol_subiti, tipo, data ecc)
    vPar = (vp.data ?? []).map((v) => ({
      ...v,
      ...partiteByID[v.partita_id],
    }))
    parametri = pm.data ?? []

    const { data: vAllFull } = await supabase.from('valutazioni')
      .select('id').eq('portiere_id', id)
      .in('allenamento_id', allenIds.length ? allenIds : ['none'])
    const valIds = (vAllFull ?? []).map((v) => v.id)
    if (valIds.length) {
      const { data: pp2 } = await supabase.from('valutazione_punteggi')
        .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', valIds)
      punteggi = pp2 ?? []
    }
  }

  // ── Calcoli allenamenti ──────────────────────────────────────────────────
  const presenzeA = vAll.filter((v) => v.presente).length
  const infortunatiA = vAll.filter((v) => v.infortunato).length
  const totA = vAll.length
  const disponibiliA = Math.max(0, totA - infortunatiA)
  const votiA = vAll.filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaA = votiA.length ? votiA.reduce((s, x) => s + x, 0) / votiA.length : null

  // Streak
  let streakMax = 0, streakAttuale = 0, curStreak = 0
  for (const v of vAll) {
    if (v.infortunato) continue
    if (v.presente) { curStreak++; streakMax = Math.max(streakMax, curStreak) }
    else curStreak = 0
  }
  streakAttuale = curStreak

  const votoMax = votiA.length ? Math.max(...votiA) : null
  const votoMin = votiA.length ? Math.min(...votiA) : null
  const sopraMedia = mediaA != null ? votiA.filter((v) => v >= mediaA).length : null

  // Trend mensile
  const votiMese = {}
  for (const v of vAll) {
    if (!v.presente || v.voto == null || !v.data) continue
    const m = v.data.slice(0, 7)
    ;(votiMese[m] ??= []).push(Number(v.voto))
  }
  const mesiOrd = Object.keys(votiMese).sort()
  const mesi = mesiOrd.slice(-6)
  let trend = null
  if (mesiOrd.length >= 2) {
    const last = votiMese[mesiOrd[mesiOrd.length - 1]]
    const prev = votiMese[mesiOrd[mesiOrd.length - 2]]
    trend = last.reduce((s, x) => s + x, 0) / last.length - prev.reduce((s, x) => s + x, 0) / prev.length
  }

  // Media categoria
  let mediaCat = null
  if (iscrizione?.squadra_id && stagione) {
    const { data: iscCat } = await supabase.from('iscrizioni')
      .select('portiere_id').eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id)
    const catIds = (iscCat ?? []).map((i) => i.portiere_id).filter((pid) => pid !== id)
    if (catIds.length) {
      const { data: vCat } = await supabase.from('valutazioni')
        .select('voto, presente').in('portiere_id', catIds)
      const votiCat = (vCat ?? []).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
      mediaCat = votiCat.length ? votiCat.reduce((s, x) => s + x, 0) / votiCat.length : null
    }
  }

  // Prima/seconda metà stagione
  const meta = Math.floor(vAll.length / 2)
  const prima = vAll.slice(0, meta).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const seconda = vAll.slice(meta).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaP1 = prima.length ? prima.reduce((s, x) => s + x, 0) / prima.length : null
  const mediaP2 = seconda.length ? seconda.reduce((s, x) => s + x, 0) / seconda.length : null

  // ── Calcoli partite ──────────────────────────────────────────────────────
  // presente=true significa che il portiere ha giocato (era in campo)
  const parCamp = vPar.filter((v) => v.tipo !== 'amichevole' && v.tipo !== 'torneo' && v.presente)
  const parCoppa = vPar.filter((v) => v.tipo === 'coppa' && v.presente)
  const parAm = vPar.filter((v) => v.tipo === 'amichevole' && v.presente)
  const mediaVotiPar = (arr) => {
    const vv = arr.filter((v) => v.voto != null).map((v) => Number(v.voto))
    return vv.length ? vv.reduce((s, x) => s + x, 0) / vv.length : null
  }
  // gol_subiti viene da partiteByID[partita_id].gol_subiti (tabella partite)
  const cleanSheet = parCamp.filter((v) => v.gol_subiti === 0).length
  const cleanSheetCoppa = parCoppa.filter((v) => v.gol_subiti === 0).length
  const puntiTot = vPar.reduce((s, v) => s + (v.punti != null ? Number(v.punti) : 0), 0)

  // Per caratteristica
  const perParametro = {}
  for (const pp of punteggi) {
    ;(perParametro[pp.parametro_id] ??= []).push(Number(pp.punteggio))
  }
  const mediaParam = (arr) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null

  const pctPresenza = disponibiliA ? Math.round(presenzeA / disponibiliA * 100) : null

  // Trend partite: confronto prima metà / seconda metà delle partite di campionato con voto
  let trendPartite = null
  const parCampConVoto = parCamp.filter((v) => v.voto != null).sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  if (parCampConVoto.length >= 4) {
    const metaP = Math.floor(parCampConVoto.length / 2)
    const primaP = parCampConVoto.slice(0, metaP).map((v) => Number(v.voto))
    const secondaP = parCampConVoto.slice(metaP).map((v) => Number(v.voto))
    trendPartite = secondaP.reduce((s, x) => s + x, 0) / secondaP.length - primaP.reduce((s, x) => s + x, 0) / primaP.length
  }

  // Obiettivi: percentuale completati (stato = 'raggiunto')
  const { data: obiettiviRows } = await supabase.from('obiettivi').select('stato').eq('portiere_id', id)
  let pctObiettivi = null
  if (obiettiviRows && obiettiviRows.length > 0) {
    const completati = obiettiviRows.filter((o) => o.stato === 'raggiunto').length
    pctObiettivi = Math.round((completati / obiettiviRows.length) * 100)
  }

  // ── Dati per grafici (passati al client component) ───────────────────────
  const oggi = new Date().toISOString().slice(0, 10)
  const ultimi30 = new Date(); ultimi30.setDate(ultimi30.getDate() - 30)
  const ultimi30str = ultimi30.toISOString().slice(0, 10)

  // Grafico 1: voti allenamenti ultimi 30gg
  const g1 = vAll
    .filter((v) => v.presente && v.voto != null && v.data >= ultimi30str)
    .map((v) => ({ x: v.data, y: Number(v.voto) }))

  // Grafico 2: voti tutta stagione (allenamenti)
  const g2 = vAll
    .filter((v) => v.presente && v.voto != null)
    .map((v) => ({ x: v.data, y: Number(v.voto) }))

  // Grafico 3: voti ultime 10 partite
  const g3 = vPar
    .filter((v) => v.presente && v.voto != null)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .slice(-10)
    .map((v) => ({ x: v.data, y: Number(v.voto), label: v.avversario ?? '' }))

  // Grafico 4: voti partite campionato
  const g4 = parCamp
    .filter((v) => v.voto != null)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .map((v) => ({ x: v.data, y: Number(v.voto), label: v.avversario ?? '' }))

  // Grafico 5: gol subiti progressivi campionato
  let golProg = 0
  const g5 = parCamp
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .map((v) => { golProg += (v.gol_subiti ?? 0); return { x: v.data, y: golProg, label: v.avversario ?? '' } })

  // Grafico 6: gol subiti progressivi coppa
  let golProgCoppa = 0
  const g6 = parCoppa
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .map((v) => { golProgCoppa += (v.gol_subiti ?? 0); return { x: v.data, y: golProgCoppa, label: v.avversario ?? '' } })

  // Grafico 7: presenze portiere vs altri portieri categoria (per mese)
  let g7 = []
  if (iscrizione?.squadra_id && stagione) {
    const { data: iscCat } = await supabase.from('iscrizioni')
      .select('portiere_id, portieri(nome, cognome)').eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id)
    const altriIds = (iscCat ?? []).filter((i) => i.portiere_id !== id)
    // Presenze mensili del portiere
    const miePresenze = {}
    for (const v of vAll) {
      if (!v.data) continue
      const m = v.data.slice(0, 7)
      miePresenze[m] = (miePresenze[m] ?? 0) + (v.presente ? 1 : 0)
    }
    g7 = mesiOrd.map((m) => ({ mese: m, io: miePresenze[m] ?? 0 }))
  }

  const datiGrafici = { g1, g2, g3, g4, g5, g6, g7, mesi, votiMese }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {navLinks}

        {/* KPI */}
        <div className="stat-kpi-grid">
          {[
            [presenzeA + '/' + disponibiliA, 'Presenze', 'var(--ink)'],
            [fmt(mediaA, 2), 'Media voto', 'var(--azzurro)'],
            [pctPresenza != null ? pctPresenza + '%' : '—', '% disponib.', pctPresenza >= 80 ? 'var(--campo)' : pctPresenza >= 60 ? 'var(--giallo)' : 'var(--rosso)'],
            [cleanSheet, 'Clean sheet', 'var(--campo)'],
          ].map(([v, l, c], i) => (
            <div key={i} className="stat-kpi">
              <div className="stat-kpi-val" style={{ color: c }}>{v}</div>
              <div className="stat-kpi-label">{l}</div>
            </div>
          ))}
        </div>

        <IndiceCrescita
          score={calcolaIndiceCrescita({
            pctObiettiviCompletati: pctObiettivi,
            trendAllenamenti: trend,
            trendPartite: trendPartite,
            pctPresenze: pctPresenza,
          })}
          dettagli={[
            { label: 'Obiettivi completati', peso: 40, valore: pctObiettivi, display: pctObiettivi != null ? pctObiettivi + '%' : null },
            { label: 'Trend allenamenti', peso: 25, valore: trend, display: trend != null ? (trend >= 0 ? '+' : '') + fmt(trend, 2) : null },
            { label: 'Trend partite', peso: 20, valore: trendPartite, display: trendPartite != null ? (trendPartite >= 0 ? '+' : '') + fmt(trendPartite, 2) : null },
            { label: 'Presenze', peso: 15, valore: pctPresenza, display: pctPresenza != null ? pctPresenza + '%' : null },
          ]}
        />

        {/* Analisi stagione */}
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Analisi stagione</h3>
          <div className="stat-rows">
            <div className="stat-block">
              {mediaCat != null && (
                <div className="stat-line"><span>Media categoria</span>
                  <b style={{ color: mediaA != null && mediaA >= mediaCat ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaCat)} {mediaA != null ? (mediaA >= mediaCat ? '▲ sopra' : '▼ sotto') : ''}
                  </b>
                </div>
              )}
              {trend != null && (
                <div className="stat-line"><span>Trend ultimo mese</span>
                  <b style={{ color: trend >= 0 ? 'var(--campo)' : 'var(--rosso)' }}>
                    {trend >= 0 ? '+' : ''}{fmt(trend, 2)} {trend >= 0 ? '📈' : '📉'}
                  </b>
                </div>
              )}
              <div className="stat-line"><span>Voto migliore</span><b style={{ color: 'var(--campo)' }}>{fmt(votoMax, 2)}</b></div>
              <div className="stat-line"><span>Voto peggiore</span><b style={{ color: 'var(--rosso)' }}>{fmt(votoMin, 2)}</b></div>
              {infortunatiA > 0 && <div className="stat-line"><span>🩹 Allenamenti persi (infortunio)</span><b>{infortunatiA}</b></div>}
            </div>
            <div className="stat-block">
              <div className="stat-line"><span>🔥 Serie attuale</span><b>{streakAttuale > 0 ? streakAttuale + ' cons.' : 'Interrotta'}</b></div>
              <div className="stat-line"><span>⭐ Serie massima</span><b>{streakMax} consecutivi</b></div>
              {sopraMedia != null && <div className="stat-line"><span>Sopra la propria media</span><b style={{ color: 'var(--campo)' }}>{sopraMedia}/{presenzeA}</b></div>}
              {mediaP1 != null && mediaP2 != null && (
                <div className="stat-line"><span>1° → 2° metà</span>
                  <b style={{ color: mediaP2 >= mediaP1 ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaP1, 1)} → {fmt(mediaP2, 1)} {mediaP2 >= mediaP1 ? '▲' : '▼'}
                  </b>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Partite */}
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Partite</h3>
          <div className="stat-rows">
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>Campionato</h4>
              <div className="stat-line"><span>Partite giocate</span><b>{parCamp.length}</b></div>
              <div className="stat-line"><span>Media voto</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parCamp))}</b></div>
              <div className="stat-line"><span>Clean sheet</span><b style={{ color: 'var(--campo)' }}>{cleanSheet}</b></div>
              <div className="stat-line"><span>Punti totali</span><b>{fmt(puntiTot, 0)}</b></div>
            </div>
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>Coppa</h4>
              <div className="stat-line"><span>Partite giocate</span><b>{parCoppa.length}</b></div>
              <div className="stat-line"><span>Media voto</span><b>{fmt(mediaVotiPar(parCoppa))}</b></div>
              <div className="stat-line"><span>Clean sheet</span><b style={{ color: 'var(--campo)' }}>{cleanSheetCoppa}</b></div>
              <h4 style={{ margin: '12px 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>Amichevoli</h4>
              <div className="stat-line"><span>Partite giocate</span><b>{parAm.length}</b></div>
              <div className="stat-line"><span>Media voto</span><b>{fmt(mediaVotiPar(parAm))}</b></div>
            </div>
          </div>
        </div>

        {/* Per caratteristica */}
        {parametri.length > 0 && Object.keys(perParametro).length > 0 && (
          <div className="scheda" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Media per caratteristica</h3>
            {parametri.map((par) => {
              const arr = perParametro[par.id] ?? []
              if (!arr.length) return null
              const med = mediaParam(arr)
              const col = med >= 7 ? 'var(--campo)' : med >= 6 ? 'var(--azzurro)' : 'var(--giallo)'
              return (
                <div key={par.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>{par.nome}</span>
                    <b style={{ color: col }}>{fmt(med, 1)}</b>
                  </div>
                  <div style={{ height: 8, background: 'var(--linea)', borderRadius: 4 }}>
                    <div style={{ width: `${Math.round((med / 10) * 100)}%`, height: '100%', background: col, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Grafici (client component) */}
        <StatisticheGrafici dati={datiGrafici} nomPortiere={`${portiere.nome} ${portiere.cognome ?? ''}`} />
      </div>
    </>
  )
}
