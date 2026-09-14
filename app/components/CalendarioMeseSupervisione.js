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
  const oggi = new Date()
  const [cursor, setCursor] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1))
  const [filtro, setFiltro] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [previewExtra, setPreviewExtra] = useState({})
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [previewPartite, setPreviewPartite] = useState({})

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const oggiStr = `${oggi.getFullYear()}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`

  const filtrati = allenamenti.filter((a) => !filtro || a.squadra_id === filtro)

  const daValutare = filtrati
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

  const cid = (ev) => `${ev._tipo}-${ev.id}`
  const hhmm = (v) => (v ? v.slice(0, 5) : '')
  const sorter = (a, b) => {
    if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
    return (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? '')
  }

  const colorAllenamento = (a) => {
    if (a.valutato) return { bg: '#2e9e5b', fg: '#fff' }
    if (a.data < oggiStr) return { bg: '#c0392b', fg: '#fff' }
    return { bg: '#1f6feb', fg: '#fff' }
  }
  const colorPartita = (p) => {
    const passata = p.data < oggiStr
    if (!passata) return { bg: '#c4b5fd', fg: '#4c1d95', dot: '#7c3aed' }
    return { bg: '#7c3aed', fg: '#fff' }
  }
  const colorEv = (ev) => ev._tipo === 'partita' ? colorPartita(ev) : colorAllenamento(ev)

  const labelPartitaCella = (p) => {
    const icona = p.casa === true ? '🏠' : p.casa === false ? '✈' : ''
    return `${p.squadra_nome}${p.avversario ? ` · ${icona} ${p.avversario}` : ''}`
  }

  async function caricaGiorno(day) {
    const evs = byDay[day] ?? []

    const partIds = evs.filter((e) => e._tipo === 'partita' && !previewPartite[e.id]).map((e) => e.id)
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

  function selezionaGiorno(day) {
    const evs = byDay[day] ?? []
    if (evs.length === 0) return
    setSelectedDay(day)
    setOpenId(evs.length === 1 ? cid(evs[0]) : null)
    caricaGiorno(day)
  }

  function handleCellClick(day) {
    if (selectedDay === day) { setSelectedDay(null); setOpenId(null); return }
    selezionaGiorno(day)
  }

  const giorniConEventi = Object.keys(byDay).map(Number).sort((a, b) => a - b)
  function vaiGiorno(delta) {
    if (!selectedDay) return
    const idx = giorniConEventi.indexOf(selectedDay)
    const nd = giorniConEventi[idx + delta]
    if (nd) selezionaGiorno(nd)
  }
  const primoGiorno = giorniConEventi[0]
  const ultimoGiorno = giorniConEventi[giorniConEventi.length - 1]

  const selectedEvs = selectedDay ? (byDay[selectedDay] ?? []).slice().sort(sorter) : []
  const nAll = selectedEvs.filter((e) => e._tipo === 'allenamento').length
  const nPar = selectedEvs.filter((e) => e._tipo === 'partita').length
  const singolo = selectedEvs.length === 1

  const selectedDateStr = selectedDay ? fmt(selectedDay) : null
  const selectedDateLabel = selectedDay
    ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const fmtMin = (m) => m >= 60 ? t('oreMin', { h: Math.floor(m / 60), min: Math.round(m % 60) }) : t('minuti', { min: Math.round(m) })
  const fmtDvData = (d) => new Date(d + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'short' })

  const isOpen = (ev) => singolo || openId === cid(ev)

  const MAX_CHIP = 4

  function dettaglio(ev) {
    const passata = ev.data < oggiStr
    if (ev._tipo === 'partita') {
      return (
        <div className="calx-detail-in">
          <div className="calx-state" style={{ color: 'var(--ink-soft)' }}>
            {ev.casa ? t('casa') : t('trasferta')}
          </div>
          {ev.assenti_annunciati?.length > 0 && (
            <div className="cal-preview-note" style={{ marginBottom: 8, background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 8, padding: '6px 8px' }}>
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
            <Link href={`${basePath}/partite/${ev.id}`} className="btn-mini">
              {passata && !ev.ha_valutazioni ? t('inserisciValutazioni') : t('apriPartita')}
            </Link>
          </div>
        </div>
      )
    }

    const daVal = passata && !ev.valutato
    const statoTxt = ev.nessuna_valutazione ? t('nessunaValPrevista')
      : ev.valutato ? t('valutato')
      : daVal ? t('daValutare')
      : t('programmato')
    const statoColor = ev.nessuna_valutazione ? 'var(--campo)'
      : ev.valutato ? 'var(--campo)'
      : daVal ? 'var(--rosso)'
      : 'var(--ink-soft)'

    return (
      <div className="calx-detail-in">
        <div className="calx-state" style={{ color: statoColor }}>{statoTxt}</div>
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
  }

  function rigaTop(ev, { onClick, mostraChev, dataLabel }) {
    const col = colorEv(ev)
    const tempo = ev._tipo === 'partita'
      ? (hhmm(ev.ora_inizio) || '—')
      : (hhmm(ev.ora_inizio) || '—') + (ev.ora_fine ? `–${hhmm(ev.ora_fine)}` : '')
    return (
      <div className="calx-row-top" onClick={onClick}>
        {dataLabel && <span className="calx-adate">{dataLabel}</span>}
        <i className="calx-rdot" style={{ background: col.dot || col.bg }} />
        <span className="calx-rtime">{tempo}</span>
        <div className="calx-rmain">
          <div className="calx-rcat">{ev.squadra_nome}</div>
          <div className="calx-rsub">
            {ev._tipo === 'partita'
              ? <>{ev.casa === true ? '🏠' : ev.casa === false ? '✈' : ''} {t('vs')} {ev.avversario || '—'}</>
              : <>{t('tipoAllenamento')}{ev.accorpata_con && <> · {t('accorpatoCon', { nome: ev.accorpata_nome || '…' })}</>}</>}
          </div>
          {ev.assenti_annunciati?.length > 0 && (
            <div className="calx-rabs">⚠ {t('assentiCount', { n: ev.assenti_annunciati.length })}</div>
          )}
        </div>
        <span className={`calx-badge ${ev._tipo === 'partita' ? 'par' : 'all'}`}>
          {ev._tipo === 'partita' ? t('badgePartita') : t('tipoAllenamento')}
        </span>
        {mostraChev && <span className="calx-rchev">›</span>}
      </div>
    )
  }

  const rowClass = (ev) => ev._tipo === 'allenamento' && ev.data < oggiStr && !ev.valutato ? 'daval' : ''

  return (
    <div className="calx">
      <div className="calx-legenda">
        <span><i className="calx-ldot" style={{ background: '#2e9e5b' }} />{t('legValutato')}</span>
        <span><i className="calx-ldot" style={{ background: '#c0392b' }} />{t('legDaValutare')}</span>
        <span><i className="calx-ldot" style={{ background: '#7c3aed' }} />{t('legPartitaPassata')}</span>
        <span><i className="calx-ldot" style={{ background: '#c4b5fd', border: '1px solid #8b5cf6' }} />{t('legPartitaFutura')}</span>
      </div>

      <div className="calx-bar">
        <div className="calx-nav">
          <button type="button" onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); setOpenId(null) }} aria-label={t('mesePrec')}>‹</button>
          <span className="calx-title">{meseTitolo}</span>
          <button type="button" onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); setOpenId(null) }} aria-label={t('meseSucc')}>›</button>
        </div>
        {categorie.length > 1 && (
          <select value={filtro} onChange={(e) => { setFiltro(e.target.value); setSelectedDay(null); setOpenId(null) }} aria-label={t('filtraCategoria')}>
            <option value="">{t('tutteCategorie')}</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      {/* ---------- Griglia mese (scorrevole in orizzontale su mobile) ---------- */}
      <div className="calx-scroll">
      <div className="calx-grid calx-head">
        {giorniShort.map((g, i) => <div key={i} className="calx-dow">{g}</div>)}
      </div>

      <div className="calx-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="calx-cell empty" />
          const evs = (byDay[day] ?? []).slice().sort(sorter)
          const isSelected = selectedDay === day
          const hasEvs = evs.length > 0
          const extra = evs.length - MAX_CHIP

          return (
            <div key={i} className={`calx-cell ${isOggi(day) ? 'oggi' : ''} ${isSelected ? 'sel' : ''} ${hasEvs ? 'has' : ''}`}
              onClick={hasEvs ? () => handleCellClick(day) : undefined}>
              <span className="calx-num calx-num-link" onClick={(e) => e.stopPropagation()}>
                <Link href={`${basePath}/calendario?data=${fmt(day)}`} onClick={(e) => e.stopPropagation()}>{day}</Link>
              </span>
              <div className="calx-evs">
                {evs.slice(0, MAX_CHIP).map((ev) => {
                  const col = colorEv(ev)
                  const bordo = ev._tipo === 'allenamento' && ev.accorpata_con
                    ? { outline: '2px solid var(--giallo)', outlineOffset: '-2px' } : {}
                  return (
                    <span key={cid(ev)} className="calx-ev" style={{ background: col.bg, color: col.fg, ...bordo }}>
                      <i className="calx-edot" style={{ background: col.dot || 'rgba(255,255,255,.9)' }} />
                      {hhmm(ev.ora_inizio) && <b>{hhmm(ev.ora_inizio)}</b>}
                      <span className="calx-ev-label">{ev._tipo === 'partita' ? labelPartitaCella(ev) : ev.squadra_nome}</span>
                    </span>
                  )
                })}
                {extra > 0 && <span className="calx-more">+{extra}</span>}
              </div>
            </div>
          )
        })}
      </div>
      </div>{/* /calx-scroll */}

      {selectedDay && (
        <div className="calx-panel">
          <div className="calx-panel-head">
            <span className="calx-panel-ic">📅</span>
            <h3 className="calx-panel-title">{selectedDateLabel}</h3>
            <div className="calx-panel-actions">
              <button type="button" className="calx-nb" onClick={() => vaiGiorno(-1)} disabled={selectedDay <= primoGiorno} aria-label={t('mesePrec')}>‹</button>
              <button type="button" className="calx-nb" onClick={() => vaiGiorno(1)} disabled={selectedDay >= ultimoGiorno} aria-label={t('meseSucc')}>›</button>
              <button type="button" className="calx-nb" onClick={() => { setSelectedDay(null); setOpenId(null) }} aria-label="Chiudi">✕</button>
            </div>
          </div>

          {selectedEvs.length > 0 && (
            <div className="calx-summary">
              {nAll > 0 && <span className="calx-chip">🏋 {t('sommarioAllenamenti', { n: nAll })}</span>}
              {nPar > 0 && <span className="calx-chip">⚽ {t('sommarioPartite', { n: nPar })}</span>}
            </div>
          )}

          <div className="calx-rows">
            {selectedEvs.map((ev) => (
              <div key={cid(ev)} className={`calx-row ${isOpen(ev) ? 'open' : ''} ${rowClass(ev)}`}>
                {rigaTop(ev, { onClick: () => { if (!singolo) setOpenId((cur) => (cur === cid(ev) ? null : cid(ev))) }, mostraChev: !singolo })}
                <div className="calx-detail">{dettaglio(ev)}</div>
              </div>
            ))}
          </div>
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
