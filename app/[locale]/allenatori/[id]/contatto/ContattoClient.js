'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function ContattoClient({ allenatoreId, nomeAllenatore, importoFee, giaUnlocked, contatti }) {
  const t = useTranslations('contattoAllenatore')
  const c = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sblocca() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/checkout-contatto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allenatoreId }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? t('errore')); setLoading(false); return }
      window.location.href = body.url
    } catch (e) { setError(t('erroreRete')); setLoading(false) }
  }

  if (giaUnlocked && contatti) {
    return (
      <div>
        <Link href={`/allenatori/${allenatoreId}`} className="link-inline" style={{ fontSize: 13 }}>{t('tornaProfilo')}</Link>
        <div className="scheda" style={{ marginTop: 24 }}>
          <h2 style={{ margin: '0 0 16px' }}>{t('contattiDi', { nome: nomeAllenatore })}</h2>
          {contatti.telefono && (
            <div className="lista-riga" style={{ marginBottom: 10 }}>
              <span>{t('telefono')}</span>
              <a href={`tel:${contatti.telefono}`} className="link-inline" style={{ fontWeight: 700 }}>{contatti.telefono}</a>
            </div>
          )}
          {contatti.citta && (
            <div className="lista-riga">
              <span>{t('citta')}</span>
              <b>{contatti.citta}</b>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/allenatori/${allenatoreId}`} className="link-inline" style={{ fontSize: 13 }}>{t('tornaProfilo')}</Link>
      <div className="scheda" style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px' }}>{t('sbloccaContatti')}</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          {t.rich('descrizione', { nome: nomeAllenatore, importo: importoFee, b: (ch) => <b>{ch}</b> })}
        </p>
        {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={sblocca} disabled={loading} type="button" style={{ minWidth: 200 }}>
          {loading ? c('caricamento') : t('pagaSblocca', { importo: importoFee })}
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-soft)' }}>{t('pagamentoSicuro')}</p>
      </div>
    </div>
  )
}
