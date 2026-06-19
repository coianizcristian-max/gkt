'use client'

import { useState } from 'react'
import Link from 'next/link'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

export default function CalendarioMese({ allenamenti, partite = [], categorie, vista = 'staff' }) {
  const isPortiere = vista === 'portiere'
  const oggi = new Date()
  const [cursor, setCursor] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1))
  const [filtro, setFiltro] = useState('')

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const filtrati = allenamenti.filter((a) => !filtro || a.squadra_id === filtro)
  const pad = (n) => String(n).padStart(2, '0')
  const oggiStr = `${oggi.getFullYear()}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`

  const daValutare = isPortiere ? [] : filtrati
    .filter((a) => !a.valutato && a.data < oggiStr)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  // Raggruppa allenamenti per giorno del mese corrente
  const byDay = {}
  for (const a of filtrati) {
    const d = new Date(a.data + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() === month)
      (byDay[d.getDate()] ??= []).push({ ...a, _tipo: 'allenamento' })
  }
  // Aggiungi partite nello stesso byDay
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
  const fmt = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const isOggi = (day) => year === oggi.getFullYear() && month === oggi.getMonth() && day === oggi.getDate()

  // Stili portiere
  const stylePortiere = (a) => {
    if (!a.presente) return { background: '#3a6ea5', borderLeft: '3px solid #1d4a78' }
    if (a.ha_voto) return { background: '#2e9e5b', borderLeft: '3px solid #1a6b3a' }
    return { background: '#c0392b', borderLeft: '3px solid #8b1a10' }
  }

  // Stile partita: viola pieno (passata) o viola chiaro (futura)
  const stylePartita = (p) => {
    const passata = p.data < oggiStr
    return passata
      ? { background: '#7c3aed', color: '#fff', borderLeft: '3px solid #5b21b6' }
      : { background: '#c4b5fd', color: '#4c1d95', borderLeft: '3px solid #8b5cf6' }
  }

  // Label partita compatta
  const labelPartita = (p) => {
    const emoji = p.casa ? '🏠' : '✈'
    return `${emoji} ${p.avversario || 'Partita'}`
  }

  return (
    <div className="cal">
      {daValutare.length > 0 && (
        <div className="da-valutare">
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

      {/* Legenda */}
      <div className="cal-legenda">
        {!isPortiere && <><span className="cal-leg-dot" style={{background:'#2e9e5b'}} />valutato<span className="cal-leg-dot" style={{background:'#c0392b'}} />da valutare</>}
        <span className="cal-leg-dot" style={{background:'#7c3aed'}} />partita passata
        <span className="cal-leg-dot" style={{background:'#c4b5fd',border:'1px solid #8b5cf6'}} />partita futura
      </div>

      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mese precedente">‹</button>
          <span className="cal-title">{MESI[month]} {year}</span>
          <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Mese successivo">›</button>
        </div>
        {categorie.length > 1 && (
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtra categoria">
            <option value="">Tutte le categorie</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      <div className="cal-grid cal-head">
        {GIORNI.map((g) => <div key={g} className="cal-dow">{g}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-cell empty" />
          const evs = (byDay[day] ?? []).sort((a, b) => {
            // allenamenti prima, partite dopo
            if (a._tipo !== b._tipo) return a._tipo === 'allenamento' ? -1 : 1
            return 0
          })
          return (
            <div key={i} className={`cal-cell ${isOggi(day) ? 'oggi' : ''}`}>
              {isPortiere
                ? <span className="cal-day">{day}</span>
                : <Link href={`/calendario/nuovo?data=${fmt(day)}`} className="cal-day" title="Nuovo allenamento">{day}</Link>}
              <div className="cal-evs">
                {evs.map((ev) => {
                  if (ev._tipo === 'partita') {
                    return (
                      <Link key={`p-${ev.id}`} href={`/partite/${ev.id}`}
                        className="cal-ev cal-ev-partita"
                        style={stylePartita(ev)}
                        title={`${ev.tipo} · ${ev.squadra_nome}`}>
                        {labelPartita(ev)}
                      </Link>
                    )
                  }
                  if (isPortiere) {
                    return (
                      <Link key={ev.id} href={`/calendario/${ev.id}`} className="cal-ev" style={stylePortiere(ev)}>
                        {ev.squadra_nome}
                      </Link>
                    )
                  }
                  const cls = ev.valutato ? 'ev-verde' : (ev.data < oggiStr ? 'ev-rosso' : '')
                  return (
                    <Link key={ev.id} href={`/calendario/${ev.id}`}
                      className={`cal-ev ${cls}`}
                      style={ev.accorpata_con ? { outline: '2px solid var(--giallo)', outlineOffset: '-2px' } : {}}>
                      {ev.squadra_nome}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
