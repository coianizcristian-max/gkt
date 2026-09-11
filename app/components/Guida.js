'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function Guida({ titolo, children, defaultOpen = false }) {
  const t = useTranslations('guida')
  const titoloEff = titolo ?? t('comeFunziona')
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="guida-box">
      <button type="button" onClick={() => setOpen((o) => !o)} className="guida-toggle">
        <span>💡 {titoloEff}</span>
        <span className="guida-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="guida-body">{children}</div>}
    </div>
  )
}
