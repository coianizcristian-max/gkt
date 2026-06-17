'use client'

import { useState } from 'react'

export default function Guida({ titolo = 'Come funziona', children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid var(--linea)', borderRadius: 10, background: 'var(--carta)', margin: '0 0 16px' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', fontWeight: 700, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
        <span>{titolo}</span>
        <span style={{ color: 'var(--ink-soft)' }}>{open ? '\u2212' : '+'}</span>
      </button>
      {open && <div style={{ padding: '0 14px 12px', color: 'var(--ink-soft)', lineHeight: 1.55 }}>{children}</div>}
    </div>
  )
}
