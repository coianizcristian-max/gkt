'use client'

import { useState } from 'react'
import Link from 'next/link'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

export default function CalendarioMese({ allenamenti, categorie, vista = 'staff' }) {
  const isPortiere = vista === 'portiere'
  const oggi = new Date()
  const [cursor, setCursor] = useState(() => {
    if (allenamenti.length) {
      const latest = allenamenti.reduce((m, a) => (a.data > m ? a.data : m), allenamenti[0].data)
      const d = new Date(latest + 'T00:00:00')
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  })
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
  const byDay = {}
  for (const a of filtrati) {
    const d = new Date(a.data + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() === month) {
      (byDay[d.getDate()] ??= []).push(a)
    }
  }

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  const fmt = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const isOggi = (day) => year === oggi.getFullYear() && month === oggi.getMonth() && day === oggi.getDate()

  // Colori lato portiere: verde = ha votato, rosso = presente senza voto, blu = non era presente
  const stylePortiere = (a) => {
    if (!a.presente) return { background: '#e8f0fb', borderLeft: '3px solid #3a6ea5' }
    if (a.ha_voto) return { background: '#e7f6ec', borderLeft: '3px solid #2e9e5b' }
    return { background: '#fdeaea', borderLeft: '3px solid #c0392b' }
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
      <div className="cal-bar">
        <div className="cal-nav">
          <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
          <span className="cal-title">{MESI[month]} {year}</span>
          <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="cal-grid cal-head">
        {GIORNI.map((g) => <div key={g} className="cal-dow">{g}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-cell empty" />
          const evs = byDay[day] ?? []
          return (
            <div key={i} className={`cal-cell ${isOggi(day) ? 'oggi' : ''}`}>
              {isPortiere
                ? <span className="cal-day">{day}</span>
                : <Link href={`/calendario/nuovo?data=${fmt(day)}`} className="cal-day" title="Nuovo allenamento">{day}</Link>}
              <div className="cal-evs">
                {evs.map((a) => {
                  if (isPortiere) {
                    return (
                      <Link key={a.id} href={`/calendario/${a.id}`} className="cal-ev" style={stylePortiere(a)}>{a.squadra_nome}</Link>
                    )
                  }
                  const cls = a.valutato ? 'ev-verde' : (a.data < oggiStr ? 'ev-rosso' : '')
                  return (
                    <Link key={a.id} href={`/calendario/${a.id}`} className={`cal-ev ${cls}`}>{a.squadra_nome}</Link>
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