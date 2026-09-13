import { Link } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaywallBanner from '@/app/components/PaywallBanner'
import StatisticheGrafici from '@/app/components/StatisticheGrafici'
import IndiceCrescita from '@/app/components/IndiceCrescita'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { calcolaIndiceCrescita } from '@/lib/indiceCrescita'
import { getStagioneAttiva } from '@/lib/tenant'
import ConfrontoPortieri from '@/app/components/ConfrontoPortieri'
import RadarCompetenze from '@/app/components/RadarCompetenze'
import ScorecardPortiere from '@/app/components/ScorecardPortiere'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const fmt = (n, dec = 2) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec }))

export default async function StatistichePortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations('statistichePortiere')
  const tp = await getTranslations('portieri')
  const c = await getTranslations('common')
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
      <Link href={`/portieri/${id}`} className="sub-nav-link">{tp('navScheda')}</Link>
      <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">{tp('navObiettivi')}</Link>
      <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link active">{tp('navStatistiche')}</Link>
    </div>
  )

  if (!canStat) {
    return (
      <>
        <div className="topbar">
          <div className="eyebrow">{soloPortiere ? tp('miaScheda') : <Link href="/portieri">{tp('titolo')}</Link>} · {c('stagione', { nome: stagione?.nome ?? '—' })}</div>
          <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
        </div>
        <div className="content">
          {navLinks}
          <div className="scheda" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%)', border: '1px solid #b8d9f5' }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{t('teaser')}</p>
          </div>
          <PaywallBanner chiave="statistiche_dettaglio" label={t('paywallLabel')} />
        </div>
      </>
    )
  }

  // ── Carica tutti i dati ─────────────────────────────────────────────────
  let vAll = [], vPar = [], punteggi = [], parametri = []
  let partiteRows = []
  let radarCat = {}

  if (stagione) {
    // "Oggi" nel fuso italiano (Europe/Rome), non in UTC (vedi nota in statistiche/page.js).
    // .lte include anche oggi, così una seduta fatta oggi conta subito.
    const oggiRoma = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
    const { data: allenamenti } = await supabase.from('allenamenti')
      .select('id, data, squadra_id').eq('stagione_id', stagione.id).lte('data', oggiRoma).order('data')
    const allenIds = (allenamenti ?? []).map((a) => a.id)
    const allenByDate = {}
    for (const a of allenamenti ?? []) allenByDate[a.id] = a.data

    // Partite con gol_subiti (campo della tabella partite, non valutazioni_partita)
    const { data: par } = await supabase.from('partite')
      .select('id, data, tipo, gol_subiti, gol_fatti, avversario, casa')
      .eq('stagione_id', stagione.id).lte('data', oggiRoma).order('data')
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
            .select('partita_id, presente, voto, punti, gol_subiti, fuori_categoria')
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
    // Unisce valutazioni_partita con i dati di partite (tipo, data ecc).
    // gol_subiti: usa il valore PER PORTIERE se presente, altrimenti il totale
    // squadra della partita (retrocompatibilità con le partite già inserite).
    vPar = (vp.data ?? []).map((v) => {
      const par = partiteByID[v.partita_id] ?? {}
      return { ...v, ...par, gol_subiti: v.gol_subiti ?? par.gol_subiti ?? null }
    })
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

    // Media di categoria per parametro (per il radar competenze)
    if (iscrizione?.squadra_id && allenIds.length) {
      const { data: iscCatR } = await supabase.from('iscrizioni')
        .select('portiere_id').eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id)
      const catIdsR = (iscCatR ?? []).map((i) => i.portiere_id).filter((pid) => pid !== id)
      if (catIdsR.length) {
        const { data: vCat } = await supabase.from('valutazioni')
          .select('id').in('portiere_id', catIdsR).in('allenamento_id', allenIds)
        const vCatIds = (vCat ?? []).map((v) => v.id)
        let ppCat = []
        for (let i = 0; i < vCatIds.length; i += 500) {
          const { data: pp } = await supabase.from('valutazione_punteggi')
            .select('parametro_id, punteggio').in('valutazione_id', vCatIds.slice(i, i + 500))
          ppCat = ppCat.concat(pp ?? [])
        }
        const acc = {}
        for (const p of ppCat) { if (p.punteggio == null) continue; (acc[p.parametro_id] ??= []).push(Number(p.punteggio)) }
        for (const k of Object.keys(acc)) radarCat[k] = acc[k].reduce((s, x) => s + x, 0) / acc[k].length
      }
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
  // Campionato ora ESCLUDE la coppa (prima le sommava insieme): tre gruppi distinti.
  const vParIn = vPar.filter((v) => !v.fuori_categoria)
  const vParFuori = vPar.filter((v) => v.fuori_categoria)
  const parCamp = vParIn.filter((v) => v.tipo !== 'amichevole' && v.tipo !== 'torneo' && v.tipo !== 'coppa' && v.presente)
  const parCoppa = vParIn.filter((v) => v.tipo === 'coppa' && v.presente)
  const parAm = vParIn.filter((v) => v.tipo === 'amichevole' && v.presente)
  const parFuori = vParFuori.filter((v) => v.presente)
  const mediaVotiPar = (arr) => {
    const vv = arr.filter((v) => v.voto != null).map((v) => Number(v.voto))
    return vv.length ? vv.reduce((s, x) => s + x, 0) / vv.length : null
  }
  // Gol subiti per gruppo (gol_subiti è già per-portiere, con fallback al totale squadra).
  const golStats = (arr) => {
    const conGol = arr.filter((v) => v.gol_subiti != null)
    const tot = conGol.reduce((s, v) => s + Number(v.gol_subiti), 0)
    return { tot, media: conGol.length ? tot / conGol.length : null, cs: conGol.filter((v) => Number(v.gol_subiti) === 0).length }
  }
  const gsCamp = golStats(parCamp)
  const gsCoppa = golStats(parCoppa)
  const gsAm = golStats(parAm)
  const gsFuori = golStats(parFuori)
  const puntiGruppo = (arr) => arr.reduce((s, v) => s + (v.punti != null ? Number(v.punti) : 0), 0)
  const cleanSheet = gsCamp.cs
  const cleanSheetCoppa = gsCoppa.cs
  const puntiTot = puntiGruppo(parCamp)

  // Per caratteristica
  const perParametro = {}
  for (const pp of punteggi) {
    ;(perParametro[pp.parametro_id] ??= []).push(Number(pp.punteggio))
  }
  const mediaParam = (arr) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null

  const assiRadar = parametri.map((p) => ({
    id: p.id,
    nome: p.nome,
    self: mediaParam(perParametro[p.id] ?? []),
    cat: radarCat[p.id] ?? null,
  }))

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
  const { data: obiettiviRows } = await supabase.from('obiettivi').select('stato, scadenza').eq('portiere_id', id)
  let pctObiettivi = null
  if (obiettiviRows && obiettiviRows.length > 0) {
    const oggiStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
    // Solo gli obiettivi "in gioco": raggiunti, oppure con scadenza già passata.
    // Quelli aperti e non ancora scaduti NON penalizzano l'indice.
    const rilevanti = obiettiviRows.filter((o) => o.stato === 'raggiunto' || (o.scadenza && o.scadenza <= oggiStr))
    if (rilevanti.length > 0) {
      const completati = rilevanti.filter((o) => o.stato === 'raggiunto').length
      pctObiettivi = Math.round((completati / rilevanti.length) * 100)
    }
  }

  // Presenze per l'INDICE: contano solo con un minimo di sedute, così un 100% su
  // uno o due allenamenti non gonfia il punteggio (il % mostrato a video resta intero).
  const pctPresenzeIndice = disponibiliA >= 3 ? pctPresenza : null
  // Indice "provvisorio" finché il segnale è scarso: meno di 2 componenti reali
  // e meno di 6 allenamenti valutati.
  const componentiRealiIndice = [pctObiettivi, trend, trendPartite, pctPresenzeIndice].filter((x) => x != null).length
  const indiceProvvisorio = componentiRealiIndice < 2 && disponibiliA < 6

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
  const g3 = vParIn
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

  // Tile della scorecard (dashboard) — riusa i valori già calcolati sopra
  const sparkVoti = g2.map((p) => p.y)
  const mediaGaraCamp = mediaVotiPar(parCamp)
  const tilesScore = [
    {
      label: t('mediaVoto'), value: fmt(mediaA, 2), valColor: 'var(--azzurro)', spark: sparkVoti,
      sub: trend != null ? (trend >= 0 ? '▲ +' : '▼ ') + fmt(Math.abs(trend), 2) : null,
      subColor: trend != null ? (trend >= 0 ? 'var(--campo)' : 'var(--rosso)') : null,
    },
    { label: t('presenze'), value: `${presenzeA}/${disponibiliA}` },
    {
      label: t('disponib'), value: pctPresenza != null ? pctPresenza + '%' : '—',
      valColor: pctPresenza == null ? undefined : pctPresenza >= 80 ? 'var(--campo)' : pctPresenza >= 60 ? 'var(--giallo)' : 'var(--rosso)',
    },
    { label: t('mediaGara'), value: fmt(mediaGaraCamp, 2), valColor: 'var(--azzurro)' },
    { label: t('cleanSheet'), value: cleanSheet, valColor: 'var(--campo)' },
    { label: t('golSubitiPartita'), value: fmt(gsCamp.media, 2) },
  ]

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? tp('miaScheda') : <Link href="/portieri">{tp('titolo')}</Link>} · {c('stagione', { nome: stagione?.nome ?? '—' })}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {navLinks}
        {soloPortiere && <ConfrontoPortieri stagioneId={stagione.id} titolo={t('confrontoSquadra')} mioId={id} anonimo />}

        {/* Scorecard KPI (dashboard) */}
        <ScorecardPortiere tiles={tilesScore} />

        <IndiceCrescita
          provvisorio={indiceProvvisorio}
          score={calcolaIndiceCrescita({
            pctObiettiviCompletati: pctObiettivi,
            trendAllenamenti: trend,
            trendPartite: trendPartite,
            pctPresenze: pctPresenzeIndice,
          })}
          dettagli={[
            { label: t('indObiettivi'), peso: 40, valore: pctObiettivi, display: pctObiettivi != null ? pctObiettivi + '%' : null },
            { label: t('indTrendAll'), peso: 25, valore: trend, display: trend != null ? (trend >= 0 ? '+' : '') + fmt(trend, 2) : null },
            { label: t('indTrendPar'), peso: 20, valore: trendPartite, display: trendPartite != null ? (trendPartite >= 0 ? '+' : '') + fmt(trendPartite, 2) : null },
            { label: t('presenze'), peso: 15, valore: pctPresenza, display: pctPresenza != null ? pctPresenza + '%' : null },
          ]}
        />

        {/* Analisi stagione */}
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('analisiStagione')}</h3>
          <div className="stat-rows">
            <div className="stat-block">
              {mediaCat != null && (
                <div className="stat-line"><span>{t('mediaCategoria')}</span>
                  <b style={{ color: mediaA != null && mediaA >= mediaCat ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaCat)} {mediaA != null ? (mediaA >= mediaCat ? t('sopra') : t('sotto')) : ''}
                  </b>
                </div>
              )}
              {trend != null && (
                <div className="stat-line"><span>{t('trendUltimoMese')}</span>
                  <b style={{ color: trend >= 0 ? 'var(--campo)' : 'var(--rosso)' }}>
                    {trend >= 0 ? '+' : ''}{fmt(trend, 2)} {trend >= 0 ? '📈' : '📉'}
                  </b>
                </div>
              )}
              <div className="stat-line"><span>{t('votoMigliore')}</span><b style={{ color: 'var(--campo)' }}>{fmt(votoMax, 2)}</b></div>
              <div className="stat-line"><span>{t('votoPeggiore')}</span><b style={{ color: 'var(--rosso)' }}>{fmt(votoMin, 2)}</b></div>
              {infortunatiA > 0 && <div className="stat-line"><span>{t('allenamentiPersi')}</span><b>{infortunatiA}</b></div>}
            </div>
            <div className="stat-block">
              <div className="stat-line"><span>{t('serieAttuale')}</span><b>{streakAttuale > 0 ? streakAttuale + ' ' + t('cons') : t('interrotta')}</b></div>
              <div className="stat-line"><span>{t('serieMassima')}</span><b>{streakMax} {t('consecutivi')}</b></div>
              {sopraMedia != null && <div className="stat-line"><span>{t('sopraMedia')}</span><b style={{ color: 'var(--campo)' }}>{sopraMedia}/{presenzeA}</b></div>}
              {mediaP1 != null && mediaP2 != null && (
                <div className="stat-line"><span>{t('primaSecondaMeta')}</span>
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
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('partite')}</h3>
          <div className="stat-rows">
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>{t('campionato')}</h4>
              <div className="stat-line"><span>{t('partiteGiocate')}</span><b>{parCamp.length}</b></div>
              <div className="stat-line"><span>{t('mediaVoto')}</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parCamp))}</b></div>
              <div className="stat-line"><span>{t('golSubiti')}</span><b>{gsCamp.tot}</b></div>
              <div className="stat-line"><span>{t('golSubitiPartita')}</span><b>{fmt(gsCamp.media, 2)}</b></div>
              <div className="stat-line"><span>{t('cleanSheet')}</span><b style={{ color: 'var(--campo)' }}>{gsCamp.cs}</b></div>
              <div className="stat-line"><span>{t('puntiTotali')}</span><b>{fmt(puntiGruppo(parCamp), 0)}</b></div>
            </div>
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>{t('coppa')}</h4>
              <div className="stat-line"><span>{t('partiteGiocate')}</span><b>{parCoppa.length}</b></div>
              <div className="stat-line"><span>{t('mediaVoto')}</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parCoppa))}</b></div>
              <div className="stat-line"><span>{t('golSubiti')}</span><b>{gsCoppa.tot}</b></div>
              <div className="stat-line"><span>{t('golSubitiPartita')}</span><b>{fmt(gsCoppa.media, 2)}</b></div>
              <div className="stat-line"><span>{t('cleanSheet')}</span><b style={{ color: 'var(--campo)' }}>{gsCoppa.cs}</b></div>
              <div className="stat-line"><span>{t('puntiTotali')}</span><b>{fmt(puntiGruppo(parCoppa), 0)}</b></div>
            </div>
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>{t('amichevoli')}</h4>
              <div className="stat-line"><span>{t('partiteGiocate')}</span><b>{parAm.length}</b></div>
              <div className="stat-line"><span>{t('mediaVoto')}</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parAm))}</b></div>
              <div className="stat-line"><span>{t('golSubiti')}</span><b>{gsAm.tot}</b></div>
              <div className="stat-line"><span>{t('golSubitiPartita')}</span><b>{fmt(gsAm.media, 2)}</b></div>
              <div className="stat-line"><span>{t('cleanSheet')}</span><b style={{ color: 'var(--campo)' }}>{gsAm.cs}</b></div>
              <div className="stat-line"><span>{t('puntiTotali')}</span><b>{fmt(puntiGruppo(parAm), 0)}</b></div>
            </div>
          </div>
        </div>

        {parFuori.length > 0 && (
          <div className="scheda" style={{ marginBottom: 14, borderLeft: '4px solid var(--giallo)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t('fcTitolo')}</h3>
            <p className="sub-intro" style={{ marginTop: 0 }}>{t('fcDesc')}</p>
            <div className="stat-rows">
              <div className="stat-block">
                <div className="stat-line"><span>{t('fcPartite')}</span><b>{parFuori.length}</b></div>
                <div className="stat-line"><span>{t('fcMedia')}</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parFuori))}</b></div>
                <div className="stat-line"><span>{t('fcGol')}</span><b>{gsFuori.tot}</b></div>
              </div>
              <div className="stat-block">
                <div className="stat-line"><span>{t('fcGolPartita')}</span><b>{fmt(gsFuori.media, 2)}</b></div>
                <div className="stat-line"><span>{t('fcClean')}</span><b style={{ color: 'var(--campo)' }}>{gsFuori.cs}</b></div>
                <div className="stat-line"><span>{t('fcPunti')}</span><b>{fmt(puntiGruppo(parFuori), 0)}</b></div>
              </div>
            </div>
          </div>
        )}

        <div className="dash-grid">
        {/* Radar competenze */}
        {assiRadar.filter((a) => a.self != null).length >= 3 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('profiloCompetenze')}</h3>
            <RadarCompetenze assi={assiRadar} labelTu={t('radarTu')} labelCat={t('mediaCategoria')} />
          </div>
        )}

        {/* Per caratteristica */}
        {parametri.length > 0 && Object.keys(perParametro).length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{t('mediaPerCaratteristica')}</h3>
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
        </div>

        {/* Grafici (client component) */}
        <StatisticheGrafici dati={datiGrafici} nomPortiere={`${portiere.nome} ${portiere.cognome ?? ''}`} />
      </div>
    </>
  )
}
