import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

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

  const { data: stagione } = await supabase.from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()
  const { data: iscrizione } = stagione
    ? await supabase.from('iscrizioni')
        .select('squadra_id, squadre(nome)')
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
              Le statistiche dettagliate includono: andamento mensile dei voti, presenze consecutive, confronto con la media della categoria, analisi per caratteristica tecnica, statistiche partite campionato separate dalle amichevoli e molto altro.
            </p>
          </div>
          <PaywallBanner chiave="statistiche_dettaglio" label="Statistiche dettaglio portiere" />
        </div>
      </>
    )
  }

  // ── Carica tutti i dati ─────────────────────────────────────────────────
  let vAll = [], vPar = [], punteggi = [], parametri = [], partite = []
  if (stagione) {
    const { data: allenamenti } = await supabase.from('allenamenti')
      .select('id, data, squadra_id').eq('stagione_id', stagione.id)
    const allenIds = (allenamenti ?? []).map((a) => a.id)
    const allenByDate = {}
    const allenByCat = {}
    for (const a of allenamenti ?? []) {
      allenByDate[a.id] = a.data
      allenByCat[a.id] = a.squadra_id
    }

    const { data: partiteRows } = await supabase.from('partite')
      .select('id, data, tipo').eq('stagione_id', stagione.id)
    const partIds = (partiteRows ?? []).map((p) => p.id)
    partite = partiteRows ?? []
    const partitiByDate = {}
    for (const p of partiteRows ?? []) partitiByDate[p.id] = { data: p.data, tipo: p.tipo }

    const [va, vp, par] = await Promise.all([
      allenIds.length
        ? supabase.from('valutazioni')
            .select('allenamento_id, presente, voto')
            .eq('portiere_id', id).in('allenamento_id', allenIds)
        : Promise.resolve({ data: [] }),
      partIds.length
        ? supabase.from('valutazioni_partita')
            .select('partita_id, presente, voto, punti, gol_subiti')
            .eq('portiere_id', id).in('partita_id', partIds)
        : Promise.resolve({ data: [] }),
      supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    ])

    vAll = (va.data ?? []).map((v) => ({ ...v, data: allenByDate[v.allenamento_id] }))
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    vPar = (vp.data ?? []).map((v) => ({ ...v, ...partitiByDate[v.partita_id] }))
    parametri = par.data ?? []

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
  const totA = vAll.length
  const votiA = vAll.filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaA = votiA.length ? votiA.reduce((s, x) => s + x, 0) / votiA.length : null

  // Streak presenze consecutive (attuale e massima)
  let streakMax = 0, streakAttuale = 0, curStreak = 0
  for (const v of vAll) {
    if (v.presente) { curStreak++; streakMax = Math.max(streakMax, curStreak) }
    else curStreak = 0
  }
  streakAttuale = curStreak

  // Voto max/min
  const votoMax = votiA.length ? Math.max(...votiA) : null
  const votoMin = votiA.length ? Math.min(...votiA) : null
  const sopraMedia = mediaA != null ? votiA.filter((v) => v >= mediaA).length : null
  const sottoMedia = mediaA != null ? votiA.filter((v) => v < mediaA).length : null

  // Trend: differenza media ultimo mese vs penultimo
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
    const avgLast = last.reduce((s, x) => s + x, 0) / last.length
    const avgPrev = prev.reduce((s, x) => s + x, 0) / prev.length
    trend = avgLast - avgPrev
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

  // Primo tempo stagione vs secondo tempo (metà degli allenamenti)
  const meta = Math.floor(vAll.length / 2)
  const prima = vAll.slice(0, meta).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const seconda = vAll.slice(meta).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaP1 = prima.length ? prima.reduce((s, x) => s + x, 0) / prima.length : null
  const mediaP2 = seconda.length ? seconda.reduce((s, x) => s + x, 0) / seconda.length : null

  // Partite
  const parCamp = vPar.filter((v) => v.tipo !== 'amichevole' && v.presente)
  const parAm = vPar.filter((v) => v.tipo === 'amichevole' && v.presente)
  const mediaVotiPar = (arr) => {
    const vv = arr.filter((v) => v.voto != null).map((v) => Number(v.voto))
    return vv.length ? vv.reduce((s, x) => s + x, 0) / vv.length : null
  }
  const cleanSheet = parCamp.filter((v) => (v.gol_subiti ?? 999) === 0).length
  const puntiTot = vPar.reduce((s, v) => s + (v.punti != null ? Number(v.punti) : 0), 0)

  // Per caratteristica
  const perParametro = {}
  for (const pp of punteggi) {
    ;(perParametro[pp.parametro_id] ??= []).push(Number(pp.punteggio))
  }
  const mediaParam = (arr) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null

  const pctPresenza = totA ? Math.round(presenzeA / totA * 100) : null
  const maxBarH = 72

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {navLinks}

        {/* KPI principali */}
        <div className="stat-kpi-grid">
          <div className="stat-kpi">
            <div className="stat-kpi-val">{presenzeA}<span className="stat-kpi-su">/{totA}</span></div>
            <div className="stat-kpi-label">Presenze</div>
          </div>
          <div className="stat-kpi">
            <div className="stat-kpi-val" style={{ color: 'var(--azzurro)' }}>{fmt(mediaA, 2)}</div>
            <div className="stat-kpi-label">Media voto</div>
          </div>
          <div className="stat-kpi">
            <div className="stat-kpi-val" style={{ color: pctPresenza >= 80 ? 'var(--campo)' : pctPresenza >= 60 ? 'var(--giallo)' : 'var(--rosso)' }}>
              {pctPresenza != null ? pctPresenza + '%' : '—'}
            </div>
            <div className="stat-kpi-label">% presenze</div>
          </div>
          <div className="stat-kpi">
            <div className="stat-kpi-val" style={{ color: 'var(--campo)' }}>{cleanSheet}</div>
            <div className="stat-kpi-label">Clean sheet</div>
          </div>
        </div>

        {/* Confronto e trend */}
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Analisi stagione</h3>
          <div className="stat-rows">
            <div className="stat-block">
              {mediaCat != null && (
                <div className="stat-line">
                  <span>Media categoria</span>
                  <b style={{ color: mediaA != null && mediaA >= mediaCat ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaCat)} {mediaA != null ? (mediaA >= mediaCat ? '▲ sopra' : '▼ sotto') : ''}
                  </b>
                </div>
              )}
              {trend != null && (
                <div className="stat-line">
                  <span>Trend ultimo mese</span>
                  <b style={{ color: trend >= 0 ? 'var(--campo)' : 'var(--rosso)' }}>
                    {trend >= 0 ? '+' : ''}{fmt(trend, 2)} {trend >= 0 ? '📈' : '📉'}
                  </b>
                </div>
              )}
              <div className="stat-line">
                <span>Voto migliore</span>
                <b style={{ color: 'var(--campo)' }}>{fmt(votoMax, 2)}</b>
              </div>
              <div className="stat-line">
                <span>Voto peggiore</span>
                <b style={{ color: 'var(--rosso)' }}>{fmt(votoMin, 2)}</b>
              </div>
            </div>
            <div className="stat-block">
              <div className="stat-line">
                <span>🔥 Serie attuale</span>
                <b>{streakAttuale > 0 ? `${streakAttuale} cons.` : 'Interrotta'}</b>
              </div>
              <div className="stat-line">
                <span>⭐ Serie massima</span>
                <b>{streakMax} consecutivi</b>
              </div>
              {sopraMedia != null && (
                <div className="stat-line">
                  <span>Allenamenti sopra media</span>
                  <b style={{ color: 'var(--campo)' }}>{sopraMedia} / {presenzeA}</b>
                </div>
              )}
              {mediaP1 != null && mediaP2 != null && (
                <div className="stat-line">
                  <span>1° metà → 2° metà</span>
                  <b style={{ color: mediaP2 >= mediaP1 ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaP1, 1)} → {fmt(mediaP2, 1)} {mediaP2 >= mediaP1 ? '▲' : '▼'}
                  </b>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Andamento mensile */}
        {mesi.length > 0 && (
          <div className="scheda" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Andamento voti mensile</h3>
            <div className="stat-mesi">
              {mesi.map((m) => {
                const arr = votiMese[m]
                const med = arr.reduce((s, x) => s + x, 0) / arr.length
                const h = Math.round((med / 10) * maxBarH)
                const isLast = m === mesi[mesi.length - 1]
                return (
                  <div key={m} className="stat-mese-col">
                    <div className="stat-mese-bar-wrap">
                      <div className="stat-mese-bar"
                        style={{ height: `${h}px`, background: isLast ? 'var(--azzurro)' : '#a8cce8' }} />
                    </div>
                    <div className="stat-mese-val">{fmt(med, 1)}</div>
                    <div className="stat-mese-label">{m.slice(5)}/{m.slice(2, 4)}</div>
                    <div className="stat-mese-label" style={{ fontSize: 9 }}>{arr.length} all.</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per caratteristica */}
        {parametri.length > 0 && Object.keys(perParametro).length > 0 && (
          <div className="scheda" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Media per caratteristica</h3>
            {parametri.map((par) => {
              const arr = perParametro[par.id] ?? []
              if (!arr.length) return null
              const med = mediaParam(arr)
              const pct = Math.round((med / 10) * 100)
              const col = med >= 7 ? 'var(--campo)' : med >= 6 ? 'var(--azzurro)' : 'var(--giallo)'
              return (
                <div key={par.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-soft)' }}>{par.nome}</span>
                    <b style={{ color: col }}>{fmt(med, 1)}</b>
                  </div>
                  <div style={{ height: 8, background: 'var(--linea)', borderRadius: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Partite */}
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Partite</h3>
          <div className="stat-rows">
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>Campionato</h4>
              <div className="stat-line"><span>Partite giocate</span><b>{parCamp.length}</b></div>
              <div className="stat-line"><span>Media voto</span><b style={{ color: 'var(--azzurro)' }}>{fmt(mediaVotiPar(parCamp))}</b></div>
              <div className="stat-line"><span>Clean sheet</span><b style={{ color: 'var(--campo)' }}>{cleanSheet}</b></div>
              <div className="stat-line"><span>Punti totali</span><b>{fmt(puntiTot, 1)}</b></div>
            </div>
            <div className="stat-block">
              <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>Amichevoli</h4>
              <div className="stat-line"><span>Partite giocate</span><b>{parAm.length}</b></div>
              <div className="stat-line"><span>Media voto</span><b>{fmt(mediaVotiPar(parAm))}</b></div>
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--carta)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--ink-soft)' }}>
                Le amichevoli non influenzano le medie ufficiali
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
