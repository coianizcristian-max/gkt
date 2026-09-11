'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function DisdiciButton({ scadenza }) {
  const t = useTranslations('disdici')
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const scadenzaLabel = scadenza
    ? new Date(scadenza).toLocaleDateString(DATE_LOCALE[locale] || 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  async function disdici() {
    const confermato = window.confirm(
      t('confermaTitolo') + '\n\n' +
      (scadenzaLabel ? t('confermaFino', { data: scadenzaLabel }) : t('confermaSenza')) +
      '\n\n' + t('confermaIrreversibile')
    )
    if (!confermato) return

    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/disdici-abbonamento', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) { setErr(body.error ?? t('errore')); setBusy(false); return }
      setDone(true)
    } catch { setErr(t('erroreRete')) }
    setBusy(false)
  }

  if (done) {
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(192,57,43,0.07)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.3)', fontSize: 13 }}>
        {t('disdetto')}{scadenzaLabel ? ' ' + t('restaFino', { data: scadenzaLabel }) : ''} {t('ricarica')}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <button
        type="button"
        className="btn-ghost btn-del"
        style={{ fontSize: 13 }}
        onClick={disdici}
        disabled={busy}
      >
        {busy ? t('elaborazione') : t('disdici')}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
        {scadenzaLabel
          ? t('noteFino', { data: scadenzaLabel })
          : t('noteScadenza')}
        {' '}{t('noteRiabbonarti')}
      </p>
    </div>
  )
}
