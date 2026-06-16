'use client'

import { useState } from 'react'
import Link from 'next/link'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

export default function CalendarioMese({ allenamenti, categorie }) {
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

  return (
    <div className="cal">
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
              <Link href={`/calendario/nuovo?data=${fmt(day)}`} className="cal-day" title="Nuovo allenamento">{day}</Link>
              <div className="cal-evs">
                {evs.map((a) => (
                  <Link key={a.id} href={`/calendario/${a.id}`} className="cal-ev">{a.squadra_nome}</Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
