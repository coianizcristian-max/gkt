'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

// Richiesta di cancellazione account e dati (diritto all'oblio, art. 17 GDPR).
// NON cancella nulla direttamente: registra la richiesta e notifica il titolare,
// che la evade con procedura controllata. Scelta voluta per non innescare
// cancellazioni a cascata distruttive lato utente.
export default function EliminaAccountBox() {
  const t = useTranslations('account')
  const [conferma, setConferma] = useState(false)
  const [stato, setStato] = useState('idle') // idle | invio | ok | errore

  async function invia() {
    if (!conferma || stato === 'invio') return
    setStato('invio')
    try {
      const res = await fetch('/api/richiesta-cancellazione', { method: 'POST' })
      setStato(res.ok ? 'ok' : 'errore')
    } catch {
      setStato('errore')
    }
  }

  return (
    <div className="scheda" style={{ marginBottom: 20, borderColor: 'rgba(192,57,43,0.35)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--rosso, #c0392b)' }}>{t('eliminaTitolo')}</h3>
      {stato === 'ok' ? (
        <p style={{ fontSize: 14, color: 'var(--campo, #2e9e5b)', margin: 0 }}>{t('eliminaInviata')}</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{t('eliminaInfo')}</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, margin: '10px 0' }}>
            <input type="checkbox" checked={conferma} onChange={(e) => setConferma(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{t('eliminaConferma')}</span>
          </label>
          <button
            onClick={invia}
            disabled={!conferma || stato === 'invio'}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
              cursor: (!conferma || stato === 'invio') ? 'not-allowed' : 'pointer',
              opacity: (!conferma || stato === 'invio') ? 0.5 : 1,
              background: 'var(--rosso, #c0392b)', color: '#fff',
            }}>
            {stato === 'invio' ? t('eliminaInvio') : t('eliminaBottone')}
          </button>
          {stato === 'errore' && (
            <p style={{ fontSize: 13, color: 'var(--rosso, #c0392b)', marginTop: 10 }}>{t('eliminaErrore')}</p>
          )}
        </>
      )}
    </div>
  )
}
