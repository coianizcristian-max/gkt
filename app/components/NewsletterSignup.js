'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function NewsletterSignup() {
  const t = useTranslations('newsletterSignup')
  const [email, setEmail] = useState('')
  const [stato, setStato] = useState('idle') // idle | invio | ok | gia | errore
  const [msg, setMsg] = useState('')

  async function invia(e) {
    e?.preventDefault?.()
    const em = email.trim()
    if (!EMAIL_RE.test(em)) { setStato('errore'); setMsg(t('emailInvalida')); return }
    setStato('invio'); setMsg('')
    try {
      const res = await fetch('/api/newsletter/iscrivi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }),
      })
      const data = await res.json()
      if (!res.ok) { setStato('errore'); setMsg(data.error || t('erroreGenerico')); return }
      if (data.stato === 'gia_iscritto') { setStato('gia'); setMsg(t('giaIscritto')) }
      else { setStato('ok'); setMsg(t('confermaInviata')) }
    } catch { setStato('errore'); setMsg(t('erroreRete')) }
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('titolo')}</div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft, #6b7e8e)', margin: '0 0 12px' }}>{t('desc')}</p>
      {stato === 'ok' || stato === 'gia' ? (
        <div style={{ fontSize: 14, color: 'var(--campo, #1f8a4c)', fontWeight: 600 }}>{msg}</div>
      ) : (
        <form onSubmit={invia} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('placeholder')}
            style={{ flex: '1 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--linea, #d8dee4)', fontSize: 15 }}
          />
          <button type="submit" disabled={stato === 'invio'} className="btn" style={{ padding: '10px 18px', borderRadius: 8 }}>
            {stato === 'invio' ? '…' : t('iscrivimi')}
          </button>
        </form>
      )}
      {stato === 'errore' && <div style={{ fontSize: 13, color: 'var(--rosso, #d6493b)', marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
