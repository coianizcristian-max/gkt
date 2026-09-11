'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }
const pad = (n) => String(n).padStart(2, '0')

export default function CalendarioMese({ allenamenti, partite = [], categorie, vista = 'staff' }) {
  const t = useTranslations('calendarioMese')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const isPortiere = vista === 'portiere'
  const oggi = new Date()
  const [cursor, setCursor] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1))
  const [filtro, setFiltro] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [previewExtra, setPreviewExtra] = useState({})
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [previewPartite, setPreviewPartite] = useState({})

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const oggiStr = `${oggi.getFullYear()}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`

  const filtrati = allenamenti.filter((a) => !filtro || a.squadra_id === filtro)

  useEffect(() => {
    const detail = selectedDay ? `${year}-${pad(month + 1)}-${pad(selectedDay)}` : null
    window.dispatchEvent(new CustomEvent('cal-giorno-selezionato', { detail }))
    return () => window.dispatchEvent(new CustomEvent('cal-giorno-selezionato', { detail: null }))
  }, [selectedDay, year, month])

  const daValutare = isPortiere ? [] : filtrati
    .filter((a) => !a.valutato && a.data < oggiStr)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  const partiteDaValutare = isPortiere ? [] : partite
    .filter((p) => !p.ha_valutazioni && p.data < oggiStr)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  const byDay = {}
  for (const a of filtrati) {
    const d = new Date(a.data + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() === month)
      (byDay[d.getDate()] ??= []).push({ ...a, _tipo: 'allenamento' })
  }
  for (const p of (partite ?? [])) {
    if (!filtro || p.squadra_id === filtro) {
      const d = new Date(p.data + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month)
        (byDay[d.getDate()] ??= []).push({ ...p, _tipo: 'partita' })
    }
  }

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  const fmt = (day) => `${year}-${pad(month + 1)}-${pad(day)}`
  const isOggi = (day) => year === oggi.getFullYear() && month === oggi.getMonth() && day === oggi.getDate()
  const giorniShort = [1, 2, 3, 4, 5, 6, 7].map((n) => t('dowShort_' + n))
  const meseTitolo = new Date(year, month, 1).toLocaleDateString(dl, { month: 'long', year: 'numeric' })

  const stylePortiere = (a) => {
    if (!a.presente) return { background: '#3a6ea5', borderLeft: '3px solid #1d4a78' }
    if (a.ha_voto) return { background: '#2e9e5b', borderLeft: '3px solid #1a6b3a' }
    return { background: '#c0392b', borderLeft: '3px solid #8b1a10' }
  }

  const stylePartita = (p) => {
    const passata = p.data < oggiStr
    if (!passata) return { background: '#c4b5fd', color: '#4c1d95', borderLeft: '3px solid #8b5cf6' }
    if (p.ha_valutazioni) return { background: '#7c3aed', color: '#fff', borderLeft: '3px solid #5b21b6' }
    return { background: '#7c3aed', color: '#fff', outline: '2px solid #c0392b', outlineOffset: '-2px' }
  }

  const labelPartita = (p) => {
    const icona = p.casa === true ? '🏠' : p.casa === false ? '✈' : '❔'
    return `${p.squadra_nome} · ${icona} ${p.avversario || t('partitaFallback')}`
  }

  async function handleCellClick(day) {
    const evs = byDay[day] ?? []
    if (selectedDay === day) { setSelectedDay(null); return }
    setSelectedDay(day)

    const partIds = (byDay[day] ?? []).filter((e) => e._tipo === 'partita' && !previewPartite[e.id]).map((e) => e.id)
    if (partIds.length > 0) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: vp } = await supabase.from('valutazioni_partita')
          .select('partita_id, voto, presente, portieri(nome, cognome)')
          .in('partita_id', partIds).eq('presente', true).order('voto', { ascending: false })
        const byPart = {}
        for (const v of (vp ?? [])) {
          if (!byPart[v.partita_id]) byPart[v.partita_id] = []
          byPart[v.partita_id].push(v)
        }
        setPreviewPartite((prev) => {
          const next = { ...prev }
          for (const id of partIds) next[id] = { valutazioni: byPart[id] ?? [] }
          return next
        })
      } catch (_) {}
    }

    const daCaricare = evs.filter((e) => e._tipo === 'allenamento' && !previewExtra[e.id])
    if (daCaricare.length === 0) return
    const idEffettivo = {}
    for (const e of daCaricare) {
      if (e.accorpata_con) {
        const primario = evs.find((o) => o._tipo === 'allenamento' && o.id !== e.id && (o.id === e.accorpata_con || o.squadra_id === e.accorpata_con))
        idEffettivo[e.id] = primario ? primario.id : e.id
      } else {
        idEffettivo[e.id] = e.id
      }
    }
    const allIds = [...new Set(Object.values(idEffettivo))]
    setLoadingExtra(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const [{ data: ae }, { data: allRows }] = await Promise.all([
        supabase.from('allenamento_esercizi').select('allenamento_id, ordine, esercizi(id, titolo, tipologia, durata_minuti, recupero_minuti)').in('allenamento_id', allIds).order('ordine'),
        supabase.from('allenamenti').select('id, obiettivi, consuntivo').in('id', daCaricare.map((e) => e.id)),
      ])
      const byAll = {}
      for (const r of (ae ?? [])) {
        if (!byAll[r.allenamento_id]) byAll[r.allenamento_id] = []
        if (r.esercizi) byAll[r.allenamento_id].push(r.esercizi)
      }
      const allMap = {}
      for (const a of (allRows ?? [])) allMap[a.id] = a
      setPreviewExtra((prev) => {
        const next = { ...prev }
        for (const e of daCaricare) {
          const effId = idEffettivo[e.id]
          next[e.id] = {
            esercizi: byAll[effId] ?? [],
            obiettivi: allMap[e.id]?.obiettivi ?? null,
            consuntivo: allMap[e.id]?.consuntivo ?? null,
            totaleMinuti: (byAll[effId] ?? []).reduce((tot, ex) => tot + (parseFloat(ex.durata_minuti) || 0) + (parseFloat(ex.recupero_minuti) || 0), 0),
          }
        }
        return next
      })
    } catch (_) {}
    setLoadingExtra(false)
  }

  async function eliminaAllenamento(ev) {
    const dipendenti = (byDay[new Date(ev.data + 'T00:00:00').getDate()] ?? [])
      .filter((o) => o._tipo === 'allenamento' && o.id !== ev.id && o.accorpata_con === ev.squadra_id)
    const nomiDipendenti = dipendenti.map((d) => d.squadra_nome).filter(Boolean)
    const avviso = nomiDipendenti.length > 0
      ? '\n\n' + t(nomiDipendenti.length === 1 ? 'avvisoAccorpateUno' : 'avvisoAccorpatePlur', { nomi: nomiDipendenti.join(', ') })
      : ''
    if (!confirm(t('confermaElimAllen', { avviso }))) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('allenamenti').delete().eq('id', ev.id)
    if (error) { alert(t('errore', { msg: error.message })); return }
    router.refresh()
  }

  async function eliminaPartita(ev) {
    if (!confirm(t('confermaElimPartita'))) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('partite').delete().eq('id', ev.id)
    if (error) { alert(t('errore', { msg: error.message })); return }
    router.refresh()
  }

  const selectedEvs = selectedDay ? (byDay[selectedDay] ?? []).sort((a, b) => {
    if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
    return (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? '')
  }) : []

  const selectedDateStr = selectedDay ? fmt(selectedDay) : null
  const selectedDateLabel = selectedDay
    ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const fmtMin = (m) => m >= 60 ? t('oreMin', { h: Math.floor(m / 60), min: Math.round(m % 60) }) : t('minuti', { min: Math.round(m) })
  const fmtDvData = (d) => new Date(d + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'short' })

  return (
    <div className="cal">
      <div className="cal-legenda">
        {!isPortiere && (
          <>
            <span className="cal-leg-dot" style={{ background: '#2e9e5b' }} />{t('legValutato')}
            <span className="cal-leg-dot" style={{ background: '#c0392b' }} />{t('legDaValutare')}
          </>
        )}
        <span className="cal-leg-dot" style={{ background: '#7c3aed' }} />{t('legPartitaPassata')}
        <span className="cal-leg-dot" style={{ background: '#c4b5fd', border: '1px solid #8b5cf6' }} />{t('legPartitaFutura')}
      </div>

      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null) }} aria-label={t('mesePrec')}>‹</button>
          <span className="cal-title">{meseTitolo}</span>
          <button type="button" onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null) }} aria-label={t('meseSucc')}>›</button>
        </div>
        {categorie.length > 1 && (
          <select value={filtro} onChange={(e) => { setFiltro(e.target.value); setSelectedDay(null) }} aria-label={t('filtraCategoria')}>
            <option value="">{t('tutteCategorie')}</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      <div className="cal-grid cal-head">
        {giorniShort.map((g, i) => <div key={i} className="cal-dow">{g}</div>)}
      </div>

      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-cell empty" />
          const evs = (byDay[day] ?? []).sort((a, b) => {
            if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
            return (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? '')
          })
          const isSelected = selectedDay === day

          return (
            <div key={i} className={`cal-cell ${isOggi(day) ? 'oggi' : ''} ${isSelected ? 'cal-cell-selected' : ''}`}
              onClick={() => handleCellClick(day)} style={{ cursor: 'pointer' }}>
              {isPortiere
                ? <span className="cal-day">{day}</span>
                : (
                  <span className="cal-day" onClick={(e) => { e.stopPropagation() }} title={t('nuovoAllenamento')}>
                    <Link href={`/calendario/nuovo?data=${fmt(day)}`} onClick={(e) => e.stopPropagation()}>{day}</Link>
                  </span>
                )}
              <div className="cal-evs">
                {evs.map((ev) => {
                  if (ev._tipo === 'partita') {
                    return (
                      <span key={`p-${ev.id}`} className="cal-ev cal-ev-partita" style={stylePartita(ev)} title={`${ev.tipo} · ${ev.squadra_nome}`}>
                        {labelPartita(ev)}
                      </span>
                    )
                  }
                  if (isPortiere) {
                    return <span key={ev.id} className="cal-ev" style={stylePortiere(ev)}>{ev.squadra_nome}</span>
                  }
                  const cls = ev.valutato ? 'ev-verde' : (ev.data < oggiStr ? 'ev-rosso' : '')
                  const eAccorpante = evs.some((o) => o._tipo === 'allenamento' && o.id !== ev.id && o.accorpata_con === ev.squadra_id)
                  const bordoAccorpamento = ev.accorpata_con
                    ? { outline: '2px solid var(--giallo)', outlineOffset: '-2px' }
                    : eAccorpante ? { outline: '2px solid var(--campo)', outlineOffset: '-2px' } : {}
                  return (
                    <span key={ev.id} className={`cal-ev ${cls}`}
                      title={eAccorpante ? t('categoriaAccorpanteTip') : undefined} style={bordoAccorpamento}>
                      {ev.squadra_nome}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <div className="cal-preview">
          <div className="cal-preview-header">
            <h3 className="cal-preview-titolo">📅 {selectedDateLabel}</h3>
            <button className="cal-preview-close" type="button" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          {selectedEvs.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '4px 0 0' }}>
              {t('nessunEvento')}{!isPortiere && t('nessunEventoStaff')}
            </p>
          )}

          {selectedEvs.map((ev) => {
            if (ev._tipo === 'partita') {
              const passata = ev.data < oggiStr
              return (
                <div key={`p-${ev.id}`} className="cal-preview-card cal-preview-partita">
                  <div className="cal-preview-card-top">
                    <div>
                      <div className="cal-preview-badge" style={{ background: '#7c3aed', color: '#fff' }}>{t('badgePartita')}</div>
                      <div className="cal-preview-categoria">{ev.squadra_nome}</div>
                    </div>
                    <div className="cal-preview-meta">
                      {ev.casa ? t('casa') : t('trasferta')}
                      {ev.gol_fatti != null && <span className="cal-preview-risultato"> · {ev.gol_fatti} - {ev.gol_subiti}</span>}
                    </div>
                  </div>
                  <div className="cal-preview-avversario">{t('vs')} {ev.avversario || '—'}</div>
                  {(ev.ora_ritrovo || ev.ora_inizio) && (
                    <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-soft)' }}>
                      {ev.ora_ritrovo && <>{t('ritrovo', { ora: ev.ora_ritrovo.slice(0, 5) })}</>}
                      {ev.ora_ritrovo && ev.ora_inizio && ' · '}
                      {ev.ora_inizio && <>{t('inizioPartita', { ora: ev.ora_inizio.slice(0, 5) })}</>}
                    </div>
                  )}
                  {ev.assenti_annunciati?.length > 0 && (
                    <div className="cal-preview-note" style={{ marginTop: 6, background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 8, padding: '6px 8px' }}>
                      <span className="cal-preview-esercizi-label">{t('assentiAnnunciati')}</span>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 13 }}>
                        {ev.assenti_annunciati.map((x, i) => (
                          <li key={i}><b>{x.nome}</b>{x.nota ? ` — ${x.nota}` : ' ' + t('assente')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {passata && ev.gol_fatti != null && (
                    <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 2 }}>{ev.gol_fatti} — {ev.gol_subiti}</span>
                      {ev.gol_subiti === 0 && <span style={{ fontSize: 12, color: 'var(--campo)', fontWeight: 700 }}>{t('cleanSheet')}</span>}
                    </div>
                  )}
                  {previewPartite[ev.id]?.valutazioni?.length > 0 && (
                    <div style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {previewPartite[ev.id].valutazioni.map((v, vi) => (
                        <div key={vi} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 8px', background: 'var(--carta)', borderRadius: 6 }}>
                          <span>{v.portieri?.nome} {v.portieri?.cognome}</span>
                          {v.voto != null && <span style={{ fontWeight: 700 }}>⭐ {v.voto}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="cal-preview-actions">
                    <Link href={`/partite/${ev.id}`} className="btn-mini">
                      {passata && !ev.ha_valutazioni ? t('inserisciValutazioni') : t('apriPartita')}
                    </Link>
                    <button type="button" className="btn-mini btn-del" onClick={() => eliminaPartita(ev)}>{t('elimina')}</button>
                  </div>
                </div>
              )
            }

            const passato = ev.data < oggiStr
            const daVal = passato && !ev.valutato

            return (
              <div key={ev.id} className={`cal-preview-card ${daVal ? 'cal-preview-daval' : ''}`}>
                <div className="cal-preview-card-top">
                  <div>
                    {ev.accorpata_con && (
                      <div className="cal-preview-badge" style={{ background: 'var(--giallo)', color: '#000' }}>{t('accorpatoCon', { nome: ev.accorpata_nome || '...' })}</div>
                    )}
                    {!ev.accorpata_con && selectedEvs.some((o) => o._tipo === 'allenamento' && o.id !== ev.id && o.accorpata_con === ev.squadra_id) && (
                      <div className="cal-preview-badge" style={{ background: 'var(--campo)', color: '#fff' }}>{t('categoriaAccorpante')}</div>
                    )}
                    <div className="cal-preview-categoria">{ev.squadra_nome}</div>
                  </div>
                  <div className="cal-preview-meta">
                    {ev.ora_inizio ? ev.ora_inizio.slice(0, 5) : '—'}
                    {ev.ora_fine ? ` → ${ev.ora_fine.slice(0, 5)}` : ''}
                  </div>
                </div>
                <div className="cal-preview-stato">
                  {ev.nessuna_valutazione
                    ? <span style={{ color: 'var(--campo)' }}>{t('nessunaValPrevista')}</span>
                    : ev.valutato
                      ? <span style={{ color: 'var(--campo)' }}>{t('valutato')}</span>
                      : daVal
                        ? <span style={{ color: 'var(--rosso)' }}>{t('daValutare')}</span>
                        : <span style={{ color: 'var(--ink-soft)' }}>{t('programmato')}</span>}
                </div>
                {ev.assenti_annunciati?.length > 0 && (
                  <div className="cal-preview-note" style={{ marginTop: 6, background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 8, padding: '6px 8px' }}>
                    <span className="cal-preview-esercizi-label">{t('assentiAnnunciati')}</span>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 13 }}>
                      {ev.assenti_annunciati.map((x, i) => (
                        <li key={i}><b>{x.nome}</b>{x.nota ? ` — ${x.nota}` : ' ' + t('assente')}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewExtra[ev.id]?.obiettivi && (
                  <div className="cal-preview-note" style={{ marginBottom: 6 }}>
                    <span className="cal-preview-esercizi-label">{t('obiettivi')}</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{previewExtra[ev.id].obiettivi}</p>
                  </div>
                )}
                {previewExtra[ev.id]?.consuntivo && (
                  <div className="cal-preview-note" style={{ marginBottom: 6 }}>
                    <span className="cal-preview-esercizi-label">{t('consuntivo')}</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{previewExtra[ev.id].consuntivo}</p>
                  </div>
                )}
                {previewExtra[ev.id] && (
                  <div className="cal-preview-esercizi">
                    {previewExtra[ev.id].esercizi.length > 0
                      ? <>
                          <div className="cal-preview-esercizi-label">{t('eserciziLabel')}</div>
                          <ol className="cal-preview-esercizi-list">
                            {previewExtra[ev.id].esercizi.map((e, i) => (
                              <li key={e.id}>
                                <span className="cal-preview-es-nome">{e.titolo}</span>
                                {e.tipologia && <span className="cal-preview-es-tipo"> · {e.tipologia}</span>}
                              </li>
                            ))}
                          </ol>
                        </>
                      : <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('nessunEsercizioPian')}</div>}
                  </div>
                )}
                {previewExtra[ev.id]?.totaleMinuti > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    {t('durataTotale')}{' '}
                    <b style={{ color: 'var(--ink)' }}>{fmtMin(previewExtra[ev.id].totaleMinuti)}</b>
                  </div>
                )}
                {loadingExtra && !previewExtra[ev.id] && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0' }}>{t('caricamentoEsercizi')}</div>
                )}
                <div className="cal-preview-actions">
                  <Link href={`/calendario/${ev.id}`} className="btn-mini">
                    {daVal ? t('inserisciValutazioniAllen') : t('apriAllenamento')}
                  </Link>
                  <button type="button" className="btn-mini btn-del" onClick={() => eliminaAllenamento(ev)}>{t('elimina')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {daValutare.length > 0 && (
        <div className="da-valutare" style={{ marginTop: 24 }}>
          <h3>{t('allenamentiDaValutare', { n: daValutare.length })}</h3>
          <div className="dv-list">
            {daValutare.map((a) => (
              <Link key={a.id} href={`/calendario/${a.id}`} className="dv-item">
                <span className="dv-data">{fmtDvData(a.data)}</span>
                <span>{a.squadra_nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {partiteDaValutare.length > 0 && (
        <div className="da-valutare" style={{ marginTop: 16 }}>
          <h3>{t('partiteDaValutare', { n: partiteDaValutare.length })}</h3>
          <div className="dv-list">
            {partiteDaValutare.map((p) => (
              <Link key={p.id} href={`/partite/${p.id}`} className="dv-item">
                <span className="dv-data">{fmtDvData(p.data)}</span>
                <span>{p.squadra_nome} · {p.casa === true ? '🏠' : p.casa === false ? '✈' : '❔'} {p.avversario || t('partitaFallback')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
