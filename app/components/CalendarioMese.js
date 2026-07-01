'use client'

import { useState } from 'react'
import Link from 'next/link'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const GIORNI_LONG  = ['lunedì','martedì','mercoledì','giovedì','venerdì','sabato','domenica']
const pad = (n) => String(n).padStart(2, '0')

export default function CalendarioMese({ allenamenti, partite = [], categorie, vista = 'staff' }) {
  const isPortiere = vista === 'portiere'
  const oggi = new Date()
  const [cursor, setCursor] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1))
  const [filtro,  setFiltro]  = useState('')
  const [selectedDay, setSelectedDay] = useState(null) // numero giorno selezionato
  const [previewExtra, setPreviewExtra] = useState({}) // { [allenamId]: { esercizi: [] } }
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [previewPartite, setPreviewPartite] = useState({}) // { [partitaId]: { valutazioni: [] } }

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()
  const startDow   = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const oggiStr = `${oggi.getFullYear()}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`

  const filtrati = allenamenti.filter((a) => !filtro || a.squadra_id === filtro)

  const daValutare = isPortiere ? [] : filtrati
    .filter((a) => !a.valutato && a.data < oggiStr)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  // Raggruppa allenamenti e partite per giorno del mese corrente
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

  const fmt    = (day) => `${year}-${pad(month + 1)}-${pad(day)}`
  const isOggi = (day) => year === oggi.getFullYear() && month === oggi.getMonth() && day === oggi.getDate()

  // Stili portiere
  const stylePortiere = (a) => {
    if (!a.presente) return { background: '#3a6ea5', borderLeft: '3px solid #1d4a78' }
    if (a.ha_voto)   return { background: '#2e9e5b', borderLeft: '3px solid #1a6b3a' }
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
    return `${p.squadra_nome} · ${icona} ${p.avversario || 'Partita'}`
  }

  // Click su cella: toggle selezione e carica esercizi lazy
  async function handleCellClick(day) {
    const evs = byDay[day] ?? []
    if (evs.length === 0) return
    if (selectedDay === day) { setSelectedDay(null); return }
    setSelectedDay(day)

    // Carica valutazioni partite del giorno non ancora caricate
    const partIds = (byDay[day] ?? []).filter(e => e._tipo === 'partita' && !previewPartite[e.id]).map(e => e.id)
    if (partIds.length > 0) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: vp } = await supabase
          .from('valutazioni_partita')
          .select('partita_id, voto, presente, portieri(nome, cognome)')
          .in('partita_id', partIds)
          .eq('presente', true)
          .order('voto', { ascending: false })
        const byPart = {}
        for (const v of (vp ?? [])) {
          if (!byPart[v.partita_id]) byPart[v.partita_id] = []
          byPart[v.partita_id].push(v)
        }
        setPreviewPartite(prev => {
          const next = { ...prev }
          for (const id of partIds) next[id] = { valutazioni: byPart[id] ?? [] }
          return next
        })
      } catch (_) {}
    }

    // Carica esercizi solo per gli allenamenti di questo giorno non ancora caricati
    const allIds = evs.filter(e => e._tipo === 'allenamento' && !previewExtra[e.id]).map(e => e.id)
    if (allIds.length === 0) return
    setLoadingExtra(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const [{ data: ae }, { data: allRows }] = await Promise.all([
        supabase.from('allenamento_esercizi')
          .select('allenamento_id, ordine, esercizi(id, titolo, tipologia, durata_minuti, recupero_minuti)')
          .in('allenamento_id', allIds)
          .order('ordine'),
        supabase.from('allenamenti')
          .select('id, obiettivi, consuntivo')
          .in('id', allIds),
      ])
      const byAll = {}
      for (const r of (ae ?? [])) {
        if (!byAll[r.allenamento_id]) byAll[r.allenamento_id] = []
        if (r.esercizi) byAll[r.allenamento_id].push(r.esercizi)
      }
      const allMap = {}
      for (const a of (allRows ?? [])) allMap[a.id] = a
      setPreviewExtra(prev => {
        const next = { ...prev }
        for (const id of allIds) next[id] = {
          esercizi: byAll[id] ?? [],
          obiettivi: allMap[id]?.obiettivi ?? null,
          consuntivo: allMap[id]?.consuntivo ?? null,
          totaleMinuti: (byAll[id] ?? []).reduce((tot, e) => tot + (parseFloat(e.durata_minuti)||0) + (parseFloat(e.recupero_minuti)||0), 0),
          totaleMinuti: (byAll[id] ?? []).reduce((tot, e) => tot + (parseFloat(e.durata_minuti)||0) + (parseFloat(e.recupero_minuti)||0), 0),
        }
        return next
      })
    } catch (_) {}
    setLoadingExtra(false)
  }

  // Preview degli eventi del giorno selezionato
  const selectedEvs = selectedDay ? (byDay[selectedDay] ?? []).sort((a, b) => {
    if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
    return 0
  }) : []

  const selectedDateStr = selectedDay ? fmt(selectedDay) : null
  const selectedDow = selectedDay ? (new Date(selectedDateStr + 'T00:00:00').getDay() + 6) % 7 : null
  const selectedDateLabel = selectedDay
    ? `${GIORNI_LONG[selectedDow]} ${selectedDay} ${MESI[month].toLowerCase()} ${year}`
    : ''

  return (
    <div className="cal">
      {/* Legenda */}
      <div className="cal-legenda">
        {!isPortiere && (
          <>
            <span className="cal-leg-dot" style={{background:'#2e9e5b'}} />valutato
            <span className="cal-leg-dot" style={{background:'#c0392b'}} />da valutare
          </>
        )}
        <span className="cal-leg-dot" style={{background:'#7c3aed'}} />partita passata
        <span className="cal-leg-dot" style={{background:'#c4b5fd',border:'1px solid #8b5cf6'}} />partita futura
      </div>

      {/* Nav mese + filtro categoria */}
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null) }} aria-label="Mese precedente">‹</button>
          <span className="cal-title">{MESI[month]} {year}</span>
          <button type="button" onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null) }} aria-label="Mese successivo">›</button>
        </div>
        {categorie.length > 1 && (
          <select value={filtro} onChange={(e) => { setFiltro(e.target.value); setSelectedDay(null) }} aria-label="Filtra categoria">
            <option value="">Tutte le categorie</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      {/* Intestazione giorni settimana */}
      <div className="cal-grid cal-head">
        {GIORNI_SHORT.map((g) => <div key={g} className="cal-dow">{g}</div>)}
      </div>

      {/* Griglia giorni */}
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-cell empty" />
          const evs = (byDay[day] ?? []).sort((a, b) => {
            if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
            return 0
          })
          const isSelected = selectedDay === day
          const hasEvs = evs.length > 0

          return (
            <div
              key={i}
              className={`cal-cell ${isOggi(day) ? 'oggi' : ''} ${isSelected ? 'cal-cell-selected' : ''}`}
              onClick={hasEvs ? () => handleCellClick(day) : undefined}
              style={hasEvs ? { cursor: 'pointer' } : {}}
            >
              {isPortiere
                ? <span className="cal-day">{day}</span>
                : (
                  <span
                    className="cal-day"
                    onClick={(e) => { e.stopPropagation(); }}
                    title="Nuovo allenamento"
                  >
                    <Link href={`/calendario/nuovo?data=${fmt(day)}`} onClick={(e) => e.stopPropagation()}>{day}</Link>
                  </span>
                )}
              <div className="cal-evs">
                {evs.map((ev) => {
                  if (ev._tipo === 'partita') {
                    return (
                      <span key={`p-${ev.id}`}
                        className="cal-ev cal-ev-partita" style={stylePartita(ev)}
                        title={`${ev.tipo} · ${ev.squadra_nome}`}>
                        {labelPartita(ev)}
                      </span>
                    )
                  }
                  if (isPortiere) {
                    return (
                      <span key={ev.id} className="cal-ev" style={stylePortiere(ev)}>
                        {ev.squadra_nome}
                      </span>
                    )
                  }
                  const cls = ev.valutato ? 'ev-verde' : (ev.data < oggiStr ? 'ev-rosso' : '')
                  return (
                    <span key={ev.id}
                      className={`cal-ev ${cls}`}
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

      {/* ── Preview giorno selezionato ── */}
      {selectedDay && (
        <div className="cal-preview">
          <div className="cal-preview-header">
            <h3 className="cal-preview-titolo">
              📅 {selectedDateLabel}
            </h3>
            <button className="cal-preview-close" type="button" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          {selectedEvs.map((ev) => {
            if (ev._tipo === 'partita') {
              const passata = ev.data < oggiStr
              return (
                <div key={`p-${ev.id}`} className="cal-preview-card cal-preview-partita">
                  <div className="cal-preview-card-top">
                    <div>
                      <div className="cal-preview-badge" style={{background:'#7c3aed',color:'#fff'}}>Partita</div>
                      <div className="cal-preview-categoria">{ev.squadra_nome}</div>
                    </div>
                    <div className="cal-preview-meta">
                      {ev.casa ? '🏠 Casa' : '✈ Trasferta'}
                      {ev.gol_fatti != null && <span className="cal-preview-risultato"> · {ev.gol_fatti} - {ev.gol_subiti}</span>}
                    </div>
                  </div>
                  <div className="cal-preview-avversario">vs {ev.avversario || '—'}</div>
                  {/* Risultato */}
                  {passata && ev.gol_fatti != null && (
                    <div style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 2 }}>
                        {ev.gol_fatti} — {ev.gol_subiti}
                      </span>
                      {ev.gol_subiti === 0 && <span style={{ fontSize: 12, color: 'var(--campo)', fontWeight: 700 }}>✓ Clean sheet</span>}
                    </div>
                  )}
                  {/* Valutazioni portieri */}
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
                      {passata && !ev.ha_valutazioni ? '⚠ Inserisci valutazioni →' : 'Apri partita →'}
                    </Link>
                  </div>
                </div>
              )
            }

            // Allenamento
            const passato = ev.data < oggiStr
            const daVal   = passato && !ev.valutato

            return (
              <div key={ev.id} className={`cal-preview-card ${daVal ? 'cal-preview-daval' : ''}`}>
                <div className="cal-preview-card-top">
                  <div>
                    {ev.accorpata_con && (
                      <div className="cal-preview-badge" style={{background:'var(--giallo)',color:'#000'}}>
                        🔗 Accorpato con {ev.accorpata_nome || '...'}
                      </div>
                    )}
                    <div className="cal-preview-categoria">{ev.squadra_nome}</div>
                  </div>
                  <div className="cal-preview-meta">
                    {ev.ora_inizio ? ev.ora_inizio.slice(0,5) : '—'}
                    {ev.ora_fine ? ` → ${ev.ora_fine.slice(0,5)}` : ''}
                  </div>
                </div>
                <div className="cal-preview-stato">
                  {ev.nessuna_valutazione
                    ? <span style={{color:'var(--campo)'}}>✓ Nessuna valutazione prevista</span>
                    : daVal
                      ? <span style={{color:'var(--rosso)'}}>⚠ Da valutare</span>
                      : passato
                        ? <span style={{color:'var(--campo)'}}>✓ Valutato</span>
                        : <span style={{color:'var(--ink-soft)'}}>Programmato</span>}
                </div>
                {/* Obiettivi e consuntivo */}
                {previewExtra[ev.id]?.obiettivi && (
                  <div className="cal-preview-note" style={{marginBottom:6}}>
                    <span className="cal-preview-esercizi-label">🎯 Obiettivi:</span>
                    <p style={{margin:'4px 0 0',fontSize:13,whiteSpace:'pre-wrap'}}>{previewExtra[ev.id].obiettivi}</p>
                  </div>
                )}
                {previewExtra[ev.id]?.consuntivo && (
                  <div className="cal-preview-note" style={{marginBottom:6}}>
                    <span className="cal-preview-esercizi-label">📝 Consuntivo:</span>
                    <p style={{margin:'4px 0 0',fontSize:13,whiteSpace:'pre-wrap'}}>{previewExtra[ev.id].consuntivo}</p>
                  </div>
                )}
                {/* Esercizi pianificati */}
                {previewExtra[ev.id] && (
                  <div className="cal-preview-esercizi">
                    {previewExtra[ev.id].esercizi.length > 0
                      ? <>
                          <div className="cal-preview-esercizi-label">📋 Esercizi:</div>
                          <ol className="cal-preview-esercizi-list">
                            {previewExtra[ev.id].esercizi.map((e, i) => (
                              <li key={e.id}>
                                <span className="cal-preview-es-nome">{e.titolo}</span>
                                {e.tipologia && <span className="cal-preview-es-tipo"> · {e.tipologia}</span>}
                              </li>
                            ))}
                          </ol>
                        </>
                      : <div style={{fontSize:12,color:'var(--ink-soft)'}}>Nessun esercizio pianificato</div>}
                  </div>
                )}
                {previewExtra[ev.id]?.totaleMinuti > 0 && (
                  <div style={{marginTop:8,fontSize:13,fontWeight:600,color:'var(--ink-soft)'}}>
                    ⏱ Durata totale stimata:{' '}
                    <b style={{color:'var(--ink)'}}>
                      {previewExtra[ev.id].totaleMinuti >= 60
                        ? `${Math.floor(previewExtra[ev.id].totaleMinuti/60)}h ${Math.round(previewExtra[ev.id].totaleMinuti%60)}min`
                        : `${Math.round(previewExtra[ev.id].totaleMinuti)} min`}
                    </b>
                  </div>
                )}
                {loadingExtra && !previewExtra[ev.id] && (
                  <div style={{fontSize:12,color:'var(--ink-soft)',margin:'6px 0'}}>Caricamento esercizi...</div>
                )}
                <div className="cal-preview-actions">
                  <Link href={`/calendario/${ev.id}`} className="btn-mini">
                    {daVal ? 'Inserisci valutazioni →' : 'Apri allenamento →'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Da valutare ── (in fondo, dopo la preview) */}
      {daValutare.length > 0 && (
        <div className="da-valutare" style={{ marginTop: 24 }}>
          <h3>Da valutare ({daValutare.length})</h3>
          <div className="dv-list">
            {daValutare.map((a) => (
              <Link key={a.id} href={`/calendario/${a.id}`} className="dv-item">
                <span className="dv-data">{new Date(a.data + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                <span>{a.squadra_nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
