'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }
const pad = (n) => String(n).padStart(2, '0')

export default function CalendarioMeseSupervisione({ allenamenti, partite = [], categorie, basePath, preparatoreId }) {
  const t = useTranslations('calendarioMese')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const isPortiere = false
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

  const daValutare = isPortiere ? [] : filtrati
    .filter((a) => !a.valutato && a.data < oggiStr)
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

  const stylePartita = (p) => {
    const passata = p.data < oggiStr
    if (!passata) return { background: '#c4b5fd', color: '#4c1d95', borderLeft: '3px solid #8b5cf6' }
    if (p.ha_valutazioni) return { background: '#7c3aed', color: '#fff', borderLeft: '3px solid #5b21b6' }
    return { background: '#7c3aed', color: '#fff', outline: '2px solid #c0392b', outlineOffset: '-2px' }
  }

  const labelPartita = (p) => `${p.casa ? '🏠' : '✈'} ${p.avversario || t('partitaFallback')}`

  async function handleCellClick(day) {
    const evs = byDay[day] ?? []
    if (evs.length === 0) return
    if (selectedDay === day) { setSelectedDay(null); return }
    setSelectedDay(day)

    const partIds = (byDay[day] ?? []).filter((e) => e._tipo === 'partita' && !previewPartite[e.id]).map((e) => e.id)
    if (partIds.length > 0) {
      try {
        const res = await fetch(`/api/supervisione-dati?tipo=preview_partite&ids=${partIds.join(',')}&preparatore_id=${preparatoreId}`)
        if (res.ok) {
          const json = await res.json()
          setPreviewPartite((prev) => {
            const next = { ...prev }
            for (const id of partIds) next[id] = { valutazioni: json.data[id] ?? [] }
            return next
          })
        }
      } catch (_) {}
    }

    const allIds = evs.filter((e) => e._tipo === 'allenamento' && !previewExtra[e.id]).map((e) => e.id)
    if (allIds.length === 0) return
    setLoadingExtra(true)
    try {
      const res = await fetch(`/api/supervisione-dati?tipo=preview_allenamenti&ids=${allIds.join(',')}&preparatore_id=${preparatoreId}`)
      if (res.ok) {
        const json = await res.json()
        setPreviewExtra((prev) => {
          const next = { ...prev }
          for (const id of allIds) next[id] = json.data[id] ?? { esercizi: [], obiettivi: null, consuntivo: null, totaleMinuti: 0 }
          return next
        })
      }
    } catch (_) {}
    setLoadingExtra(false)
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
        <span className="cal-leg-dot" style={{ background: '#2e9e5b' }} />{t('legValutato')}
        <span className="cal-leg-dot" style={{ background: '#c0392b' }} />{t('legDaValutare')}
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
          const hasEvs = evs.length > 0

          return (
            <div key={i} className={`cal-cell ${isOggi(day) ? 'oggi' : ''} ${isSelected ? 'cal-cell-selected' : ''}`}
              onClick={hasEvs ? () => handleCellClick(day) : undefined} style={hasEvs ? { cursor: 'pointer' } : {}}>
              <span className="cal-day" onClick={(e) => { e.stopPropagation() }} title={t('nuovoAllenamento')}>
                <Link href={`${basePath}/calendario?data=${fmt(day)}`} onClick={(e) => e.stopPropagation()}>{day}</Link>
              </span>
              <div className="cal-evs">
                {evs.map((ev) => {
                  if (ev._tipo === 'partita') {
                    return (
                      <span key={`p-${ev.id}`} className="cal-ev cal-ev-partita" style={stylePartita(ev)} title={`${ev.tipo} · ${ev.squadra_nome}`}>
                        {labelPartita(ev)}
                      </span>
                    )
                  }
                  const cls = ev.valutato ? 'ev-verde' : (ev.data < oggiStr ? 'ev-rosso' : '')
                  return (
                    <span key={ev.id} className={`cal-ev ${cls}`}
                      style={ev.accorpata_con ? { outline: '2px solid var(--giallo)', outlineOffset: '-2px' } : {}}>
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
                    <Link href={`${basePath}/partite/${ev.id}`} className="btn-mini">
                      {passata && !ev.ha_valutazioni ? t('inserisciValutazioni') : t('apriPartita')}
                    </Link>
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
                    : daVal
                      ? <span style={{ color: 'var(--rosso)' }}>{t('daValutare')}</span>
                      : passato
                        ? <span style={{ color: 'var(--campo)' }}>{t('valutato')}</span>
                        : <span style={{ color: 'var(--ink-soft)' }}>{t('programmato')}</span>}
                </div>
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
                  <Link href={`${basePath}/calendario/${ev.id}`} className="btn-mini">
                    {daVal ? t('inserisciValutazioniAllen') : t('apriAllenamento')}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {daValutare.length > 0 && (
        <div className="da-valutare" style={{ marginTop: 24 }}>
          <h3>{t('daValutareHeader', { n: daValutare.length })}</h3>
          <div className="dv-list">
            {daValutare.map((a) => (
              <Link key={a.id} href={`${basePath}/calendario/${a.id}`} className="dv-item">
                <span className="dv-data">{fmtDvData(a.data)}</span>
                <span>{a.squadra_nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
