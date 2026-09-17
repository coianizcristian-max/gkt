'use client'

import { useState } from 'react'

/** Voce di menu che attiva la modalita' demo. */
export default function DemoEntra({ label, className }) {
  const [attesa, setAttesa] = useState(false)

  async function entra() {
    setAttesa(true)
    const r = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'entra' }),
    })
    if (r.ok) window.location.href = '/dashboard'
    else setAttesa(false)
  }

  return (
    <button type="button" className={className} onClick={entra} disabled={attesa}>
      {label}
    </button>
  )
}
