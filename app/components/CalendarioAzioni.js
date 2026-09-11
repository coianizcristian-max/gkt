'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

// Ascolta la selezione del giorno nel CalendarioMese e precompila la data
// nei link "Nuovo allenamento" / "Nuova partita".
export default function CalendarioAzioni() {
  const t = useTranslations('calendarioAzioni')
  const [data, setData] = useState(null)

  useEffect(() => {
    const h = (e) => setData(e.detail || null)
    window.addEventListener('cal-giorno-selezionato', h)
    return () => window.removeEventListener('cal-giorno-selezionato', h)
  }, [])

  const q = data ? `?data=${data}` : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Link href={`/calendario/nuovo${q}`} className="btn-azione">{t('nuovoAllenamento')}</Link>
      <Link href={`/partite/nuova${q}`} className="btn-azione" style={{ textAlign: 'center' }}>{t('nuovaPartita')}</Link>
    </div>
  )
}
