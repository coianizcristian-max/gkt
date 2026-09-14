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

  const cid = (ev) => `${ev._tipo}-${ev.id}`
  const hhmm = (v) => (v ? v.slice(0, 5) : '')
  const sorter = (a, b) => {
    if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
    return (a.ora_inizio ?? '').localeCompare(b.ora_inizio ?? '')
  }

  const colorAllenamento = (a) => {
    if (isPortiere) {
      if (a.ha_voto) return { bg: '#2e9e5b', fg: '#fff' }
      if (a.presente === false) return { bg: '#9aa6b2', fg: '#fff' }
      if (a.data < oggiStr && a.presente === true) return { bg: '#1f6feb', fg: '#fff', outline: '2px solid #e8a72c' }
      return { bg: '#1f6feb', fg: '#fff' }
    }
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
      const [{ data: ae }, { data: allRows }, { data: valRows }] = await Promise.all([
        supabase.from('allenamento_esercizi').select('allenamento_id, ordine, esercizi(id, titolo, tipologia, durata_minuti, recupero_minuti)').in('allenamento_id', allIds).order('ordine'),
        supabase.from('allenamenti').select('id, obiettivi, consuntivo').in('id', daCaricare.map((e) => e.id)),
        !isPortiere
          ? supabase.from('valutazioni').select('allenamento_id, voto, portieri(nome, cognome)').in('allenamento_id', daCaricare.map((e) => e.id)).eq('presente', true).not('voto', 'is', null).order('voto', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])
      const byVal = {}
      for (const v of (valRows ?? [])) (byVal[v.allenamento_id] ??= []).push(v)
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
            valutazioni: byVal[e.id] ?? [],
            totaleMinuti: (byAll[effId] ?? []).reduce((tot, ex) => tot + (parseFloat(ex.durata_minuti) || 0) + (parseFloat(ex.recupero_minuti) || 0), 0),
          }
        }
        return next
      })
    } catch (_) {}
    setLoadingExtra(false)
  }

  function selezionaGiorno(day) {
    const evs = byDay[day] ?? []
    setSelectedDay(day)
    setOpenId(evs.length === 1 ? cid(evs[0]) : null)
    caricaGiorno(day)
  }

  function handleCellClick(day) {
    if (selectedDay === day) { setSelectedDay(null); setOpenId(null); return }
    selezionaGiorno(day)
  }

  function vaiGiorno(delta) {
    if (!selectedDay) return
    const nd = selectedDay + delta
    if (nd < 1 || nd > daysInMonth) return
    selezionaGiorno(nd)
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

  // ----- dettaglio evento (usato sia nel pannello desktop sia nell'agenda mobile) -----
  function dettaglio(ev) {
    const passata = ev.data < oggiStr
    if (ev._tipo === 'partita') {
      return (
        <div className="calx-detail-in">
          <div className="calx-state" style={{ color: 'var(--ink-soft)' }}>
            {ev.casa ? t('casa') : t('trasferta')}
          </div>
          {(ev.ora_ritrovo || ev.ora_inizio) && (
            <div style={{ marginBottom: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
              {ev.ora_ritrovo && <>{t('ritrovo', { ora: hhmm(ev.ora_ritrovo) })}</>}
              {ev.ora_ritrovo && ev.ora_inizio && ' · '}
              {ev.ora_inizio && <>{t('inizioPartita', { ora: hhmm(ev.ora_inizio) })}</>}
            </div>
          )}
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
            <Link href={`/partite/${ev.id}`} className="btn-mini">
              {passata && !ev.ha_valutazioni ? t('inserisciValutazioni') : t('apriPartita')}
            </Link>
            <button type="button" className="btn-mini btn-del" onClick={() => eliminaPartita(ev)}>{t('elimina')}</button>
          </div>
        </div>
      )
    }

    const daVal = passata && !ev.valutato
    let statoTxt, statoColor
    if (ev.nessuna_valutazione) {
      statoTxt = t('nessunaValPrevista'); statoColor = 'var(--campo)'
    } else if (isPortiere) {
      if (ev.presente === false) { statoTxt = t('assente').replace(/^./, (c) => c.toUpperCase()); statoColor = 'var(--ink-soft)' }
      else if (ev.ha_voto) { statoTxt = t('valutato'); statoColor = 'var(--campo)' }
      else if (passata && ev.presente === true) { statoTxt = t('daValutare'); statoColor = '#9a6a12' }
      else { statoTxt = t('programmato'); statoColor = 'var(--ink-soft)' }
    } else {
      statoTxt = ev.valutato ? t('valutato') : daVal ? t('daValutare') : t('programmato')
      statoColor = ev.valutato ? 'var(--campo)' : daVal ? 'var(--rosso)' : 'var(--ink-soft)'
    }

    return (
      <div className="calx-detail-in">
        <div className="calx-state" style={{ color: statoColor }}>{statoTxt}</div>
        {isPortiere && ev.ha_voto && (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--campo)', margin: '2px 0 8px' }}>⭐ {ev.voto_portiere}</div>
        )}
        {isPortiere && (ev.voto_coach != null || ev.note_coach) && (
          <div className="cal-preview-note" style={{ marginBottom: 8 }}>
            <span className="cal-preview-esercizi-label">{t('valutazioneAllenatore')}</span>
            {ev.voto_coach != null && <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--campo)', margin: '2px 0' }}>⭐ {ev.voto_coach}</div>}
            {ev.note_coach && <p style={{ margin: '2px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{ev.note_coach}</p>}
          </div>
        )}
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
        {!isPortiere && previewExtra[ev.id]?.valutazioni?.length > 0 && (
          <div className="cal-preview-note" style={{ marginBottom: 8 }}>
            <span className="cal-preview-esercizi-label">{t('votiPortieri')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {previewExtra[ev.id].valutazioni.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, background: 'var(--carta)', borderRadius: 6, padding: '4px 8px' }}>
                  <span>{v.portieri?.nome} {v.portieri?.cognome}</span>
                  <b>⭐ {v.voto}</b>
                </div>
              ))}
            </div>
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
            {isPortiere ? t('apriAllenamento') : (daVal ? t('inserisciValutazioniAllen') : t('apriAllenamento'))}
          </Link>
          {!isPortiere && <button type="button" className="btn-mini btn-del" onClick={() => eliminaAllenamento(ev)}>{t('elimina')}</button>}
        </div>
      </div>
    )
  }

  // ----- testata riga evento (dot, ora, categoria, badge) -----
  function rigaTop(ev, { onClick, mostraChev, dataLabel }) {
    const col = colorEv(ev)
    const tempo = ev._tipo === 'partita'
      ? (hhmm(ev.ora_inizio) || hhmm(ev.ora_ritrovo) || '—')
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
        {isPortiere ? (
          <>
            <span><i className="calx-ldot" style={{ background: '#2e9e5b' }} />{t('legValutato')}</span>
            <span><i className="calx-ldot" style={{ background: '#1f6feb', border: '2px solid #e8a72c' }} />{t('legDaValutare')}</span>
          </>
        ) : (
          <>
            <span><i className="calx-ldot" style={{ background: '#2e9e5b' }} />{t('legValutato')}</span>
            <span><i className="calx-ldot" style={{ background: '#c0392b' }} />{t('legDaValutare')}</span>
          </>
        )}
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
          const extra = evs.length - MAX_CHIP

          return (
            <div key={i} className={`calx-cell ${isOggi(day) ? 'oggi' : ''} ${isSelected ? 'sel' : ''} ${evs.length ? 'has' : ''}`}
              onClick={() => handleCellClick(day)}>
              {isPortiere
                ? <span className="calx-num">{day}</span>
                : (
                  <span className="calx-num calx-num-link" onClick={(e) => e.stopPropagation()} title={t('nuovoAllenamento')}>
                    <Link href={`/calendario/nuovo?data=${fmt(day)}`} onClick={(e) => e.stopPropagation()}>{day}</Link>
                  </span>
                )}
              <div className="calx-evs">
                {evs.slice(0, MAX_CHIP).map((ev) => {
                  const col = colorEv(ev)
                  const eAccorpante = !isPortiere && ev._tipo === 'allenamento' && evs.some((o) => o._tipo === 'allenamento' && o.id !== ev.id && o.accorpata_con === ev.squadra_id)
                  const bordo = ev._tipo === 'allenamento' && ev.accorpata_con
                    ? { outline: '2px solid var(--giallo)', outlineOffset: '-2px' }
                    : eAccorpante ? { outline: '2px solid var(--campo)', outlineOffset: '-2px' } : {}
                  return (
                    <span key={cid(ev)} className="calx-ev" style={{ background: col.bg, color: col.fg, ...(col.outline ? { outline: col.outline, outlineOffset: '-2px' } : {}), ...bordo }}>
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

      {/* pannello giorno (desktop) */}
      {selectedDay && (
        <div className="calx-panel">
          <div className="calx-panel-head">
            <span className="calx-panel-ic">📅</span>
            <h3 className="calx-panel-title">{selectedDateLabel}</h3>
            <div className="calx-panel-actions">
              <button type="button" className="calx-nb" onClick={() => vaiGiorno(-1)} disabled={selectedDay <= 1} aria-label={t('mesePrec')}>‹</button>
              <button type="button" className="calx-nb" onClick={() => vaiGiorno(1)} disabled={selectedDay >= daysInMonth} aria-label={t('meseSucc')}>›</button>
              <button type="button" className="calx-nb" onClick={() => { setSelectedDay(null); setOpenId(null) }} aria-label="Chiudi">✕</button>
            </div>
          </div>

          {selectedEvs.length > 0 && (
            <div className="calx-summary">
              {nAll > 0 && <span className="calx-chip">🏋 {t('sommarioAllenamenti', { n: nAll })}</span>}
              {nPar > 0 && <span className="calx-chip">⚽ {t('sommarioPartite', { n: nPar })}</span>}
            </div>
          )}

          {selectedEvs.length === 0 && (
            <p className="calx-empty">{t('nessunEvento')}{!isPortiere && t('nessunEventoStaff')}</p>
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
