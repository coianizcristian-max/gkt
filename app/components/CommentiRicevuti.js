'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function CommentiRicevuti({ preparatoreId }) {
  const t = useTranslations('commentiRicevuti')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const [commenti, setCommenti] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      try {
        const res = await fetch(`/api/commenti-supervisione?preparatore_id=${preparatoreId}`)
        if (res.ok) {
          const json = await res.json()
          setCommenti(json.commenti ?? [])
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    carica()
  }, [preparatoreId])

  if (loading) return null
  if (commenti.length === 0) return null

  return (
    <div className="scheda" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{t('titolo')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {commenti.slice(0, 5).map((c) => (
          <div key={c.id} style={{ background: 'rgba(10,126,194,0.06)', borderRadius: 'var(--r-sm)', padding: '8px 12px', borderLeft: '3px solid var(--azzurro)' }}>
            <div style={{ fontSize: 13 }}>{c.testo}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
              {c.mittente} · {new Date(c.created_at).toLocaleDateString(dl, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {c.contesto ? ` · ${c.contesto}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
