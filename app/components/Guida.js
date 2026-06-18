'use client'

import { useState } from 'react'

export default function Guida({ titolo = 'Come funziona', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="guida-box">
      <button type="button" onClick={() => setOpen((o) => !o)} className="guida-toggle">
        <span>💡 {titolo}</span>
        <span className="guida-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="guida-body">{children}</div>}
    </div>
  )
}
