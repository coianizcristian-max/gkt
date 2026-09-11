'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function MieiPreparatoriClient({ preparatoriIniziali }) {
  const t = useTranslations('mieiPreparatori')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const router = useRouter()
  const [preparatori, setPreparatori] = useState(preparatoriIniziali)
  const [busy, setBusy] = useState(null)
  const [errore, setErrore] = useState('')

  const attivi = preparatori.filter((p) => p.attivo)
  const revocati = preparatori.filter((p) => !p.attivo)

  async function revoca(preparatoreId) {
    if (!confirm(t('confermaRevoca'))) return
    setBusy(preparatoreId); setErrore('')
    try {
      const res = await fetch('/api/revoca-supervisione', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparatore_id: preparatoreId }),
      })
      if (!res.ok) { const json = await res.json(); setErrore(json.error ?? t('erroreRevoca')) }
      else {
        setPreparatori((prev) => prev.map((p) => p.preparatore_id === preparatoreId
          ? { ...p, attivo: false, revocato_il: new Date().toISOString() } : p))
      }
    } catch (e) { setErrore(e.message) }
    setBusy(null)
  }

  return (
    <div className="content">
      <p className="sub-intro">
        {t.rich('intro', { inviti: (ch) => <Link href="/inviti">{ch}</Link>, em: (ch) => <em>{ch}</em> })}
      </p>

      {errore && <div className="err" style={{ marginBottom: 12 }}>{errore}</div>}

      <div className="scheda">
        <h3 style={{ marginTop: 0 }}>{t('collegati', { n: attivi.length })}</h3>
        {attivi.length === 0 && (
          <p className="sub-intro">
            {t.rich('nessunoCollegato', { inviti: (ch) => <Link href="/inviti">{ch}</Link>, em: (ch) => <em>{ch}</em> })}
          </p>
        )}
        {attivi.map((p) => (
          <div key={p.preparatore_id} className="lista-riga" style={{ alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'var(--azzurro-chiaro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {p.foto_url && <Image src={p.foto_url} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />}
              {!p.foto_url && '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome_completo}</div>
              {p.citta && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.citta}</div>}
              {p.stagione_attiva
                ? <div style={{ fontSize: 12, color: 'var(--verde)' }}>📅 {p.stagione_attiva.nome}</div>
                : <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('nessunaStagione')}</div>}
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                {t('collegatoIl', { data: new Date(p.collegato_il).toLocaleDateString(dl) })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link href={`/responsabile/preparatore/${p.preparatore_id}`} className="btn btn-mini" style={{ textDecoration: 'none' }}>{t('area')}</Link>
              <button className="btn-mini btn-del" onClick={() => revoca(p.preparatore_id)} disabled={busy === p.preparatore_id} type="button">
                {busy === p.preparatore_id ? '...' : t('revoca')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {revocati.length > 0 && (
        <div className="scheda" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{t('revocati', { n: revocati.length })}</h3>
          {revocati.map((p) => (
            <div key={p.preparatore_id} className="lista-riga assente" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'var(--linea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: 0.5 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, opacity: 0.6 }}>{p.nome_completo}</div>
                {p.revocato_il && (
                  <div style={{ fontSize: 11, color: 'var(--rosso)' }}>{t('revocatoIl', { data: new Date(p.revocato_il).toLocaleDateString(dl) })}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
