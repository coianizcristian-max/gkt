'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function CollegaSupervisoreBox({ supervisoreAttuale }) {
  const t = useTranslations('collegaSupervisore')
  const router = useRouter()
  const [codice, setCodice] = useState('')
  const [busy, setBusy] = useState(false)
  const [messaggio, setMessaggio] = useState('')
  const [errore, setErrore] = useState('')

  async function collega() {
    if (!codice.trim()) { setErrore(t('inserisciCodice')); return }
    setBusy(true)
    setErrore('')
    setMessaggio('')
    try {
      let token = codice.trim()
      if (token.includes('invito=')) {
        token = token.split('invito=')[1].split('&')[0]
      }

      const res = await fetch('/api/consuma-invito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()

      if (!res.ok) {
        setErrore(json.error ?? t('codiceNonValido'))
      } else if (json.tipo !== 'preparatore') {
        setErrore(t('nonSupervisione'))
      } else {
        setMessaggio(t('collegato'))
        setCodice('')
        router.refresh()
      }
    } catch (e) {
      setErrore(e.message)
    }
    setBusy(false)
  }

  if (supervisoreAttuale) {
    return (
      <div className="scheda" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t('supervisore')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔗</span>
          <div>
            <div style={{ fontWeight: 600 }}>{t('seiCollegato')}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t('puoVedere')}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scheda" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>{t('collegatiTitolo')}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>{t('collegatiDesc')}</p>

      {errore && <div className="err" style={{ marginBottom: 10 }}>{errore}</div>}
      {messaggio && (
        <div style={{
          background: 'rgba(46,158,91,0.08)', border: '1px solid var(--verde)',
          borderRadius: 'var(--r-sm)', padding: '10px 14px',
          fontSize: 13, color: 'var(--verde)', marginBottom: 10,
        }}>
          {messaggio}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={codice}
          onChange={(e) => setCodice(e.target.value)}
          placeholder={t('placeholder')}
          style={{
            flex: 1, minWidth: 200,
            padding: '10px 14px',
            border: '1px solid var(--linea)',
            borderRadius: 'var(--r-sm)',
            fontSize: 14,
            background: 'var(--carta)',
          }}
          onKeyDown={(e) => e.key === 'Enter' && collega()}
        />
        <button
          className="btn"
          onClick={collega}
          disabled={busy || !codice.trim()}
          type="button"
          style={{ flexShrink: 0 }}
        >
          {busy ? t('collegamento') : t('collegati')}
        </button>
      </div>
    </div>
  )
}
