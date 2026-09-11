'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function EliminaAllenamentoButton({ id }) {
  const t = useTranslations('eliminaAllenamento')
  const c = useTranslations('common')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function conferma() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/allenamenti/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('erroreElim'))
      router.push('/calendario')
      router.refresh()
    } catch (err) {
      setError(err.message || t('erroreImprevisto'))
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="elimina-conferma">
        <span className="elimina-conferma-testo">{t('conferma')}</span>
        <button
          type="button"
          className="btn-danger-solid"
          onClick={conferma}
          disabled={deleting}
        >
          {deleting ? t('eliminando') : t('siElimina')}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          {c('annulla')}
        </button>
        {error && <span className="elimina-conferma-errore">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn-icon-danger"
      onClick={() => setConfirming(true)}
      aria-label={t('aria')}
      title={t('aria')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 7H20M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7M18 7L17.3 19.1C17.2 20.1 16.4 20.8 15.4 20.8H8.6C7.6 20.8 6.8 20.1 6.7 19.1L6 7"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M10 11V16.5M14 11V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}
