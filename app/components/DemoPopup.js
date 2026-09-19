'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { trackEvento } from '@/app/components/PostHogProvider'
import { trackMetaEvento } from '@/app/components/MetaPixel'
import { leggiAttribuzione, fonteAttribuzione } from '@/app/components/AttribuzioneUtm'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

function dataLeggibile(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(DATE_LOCALE[locale] || 'it-IT',
    { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Popup di benvenuto in modalita' demo: stesso stile di VersionePopup.
 *
 * `ospite` = visitatore arrivato da /d, quindi NON registrato: a lui, e solo
 * a lui, il popup propone anche l'iscrizione alla newsletter. Il check e'
 * attivo di default; se resta attivo l'email diventa obbligatoria, se lo
 * toglie entra comunque senza lasciare nulla.
 *
 * Un preparatore gia' registrato che entra in demo dal menu vede il popup
 * esattamente come prima.
 */
export default function DemoPopup({ dataTaglio, ospite = false }) {
  const t = useTranslations('demo')
  const tn = useTranslations('newsletterSignup')
  const locale = useLocale()
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)
  const [iscrivi, setIscrivi] = useState(true)
  const [email, setEmail] = useState('')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  async function segnaVisto() {
    await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'avviso-visto' }),
    })
  }

  /** Chiusura dalla ✕: non iscrive e non blocca mai. */
  async function chiudi() {
    setClosing(true)
    await segnaVisto()
    setVisible(false)
  }

  /**
   * Pulsante principale. Se il check e' attivo l'email e' obbligatoria e va
   * a buon fine prima di entrare; se e' tolto si entra e basta.
   */
  async function conferma() {
    setErrore('')

    if (ospite && iscrivi) {
      const em = email.trim()
      if (!EMAIL_RE.test(em)) { setErrore(tn('emailInvalida')); return }
      setInvio(true)
      try {
        const res = await fetch('/api/newsletter/iscrivi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Iscrizione immediata: il consenso e' l'atto del visitatore che
          // scrive l'email e preme il pulsante, con l'informativa sotto al
          // campo. La route registra data e origine del consenso.
          body: JSON.stringify({ email: em, immediata: true, origine: 'demo', fonte: fonteAttribuzione() }),
        })
        const dati = await res.json().catch(() => ({}))
        if (!res.ok) { setErrore(dati.error || tn('erroreGenerico')); setInvio(false); return }
        // Contatto acquisito: e' la conversione che conta davvero, perche'
        // e' l'unico dato che resta tuo anche se il visitatore non si iscrive.
        const attribuzione = leggiAttribuzione() || {}
        trackMetaEvento('Lead', { fonte: attribuzione.utm_source || 'demo' })
        trackEvento('newsletter_da_demo', { ...attribuzione, esito: dati.stato || 'iscritto' })
      } catch {
        setErrore(tn('erroreRete')); setInvio(false); return
      }
      setInvio(false)
    }

    setClosing(true)
    await segnaVisto()
    setVisible(false)
  }

  if (!visible) return null

  const punti = ['punto1', 'punto2', 'punto3', 'punto4']

  return (
    <div className="versione-overlay">
      {/* demo-popup: header e fondo fissi, solo il testo scorre. Cosi' su
          mobile la spunta newsletter, l'email e il pulsante restano sempre
          visibili anche quando il testo e' lungo. */}
      <div className={`versione-popup demo-popup ${closing ? 'closing' : ''}`}>
        <div className="versione-header">
          <div>
            <div className="demo-badge">{t('badge')}</div>
            <h2 className="versione-titolo demo-titolo">{t('popupTitolo')}</h2>
            <div className="versione-numero">{t('bannerData', { data: dataLeggibile(dataTaglio, locale) })}</div>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">{t('popupIntro', { data: dataLeggibile(dataTaglio, locale) })}</p>
          <ul className="versione-lista">
            {punti.map((k) => (
              <li key={k} className="versione-item">
                <span className="versione-bullet">✓</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          <div className="demo-uscita">{t('comeUscire')}</div>
        </div>

        <div className="demo-popup-fondo">
        {ospite && (
          <div className="demo-popup-newsletter">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={iscrivi}
                onChange={(e) => { setIscrivi(e.target.checked); setErrore('') }}
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
              />
              <span>{tn('titolo')}</span>
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrore('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') conferma() }}
              disabled={!iscrivi}
              placeholder={tn('placeholder')}
              autoComplete="email"
              style={{
                width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${errore ? 'var(--rosso, #d6493b)' : 'var(--linea, #d8dee4)'}`,
                fontSize: 16, opacity: iscrivi ? 1 : 0.45,
              }}
            />

            <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', marginTop: 8, lineHeight: 1.45 }}>
              {tn.rich('consenso', {
                privacy: (ch) => <Link href="/privacy-policy" target="_blank" style={{ color: 'var(--azzurro)', textDecoration: 'underline' }}>{ch}</Link>,
              })}
            </div>

            {errore && (
              <div style={{ fontSize: 13, color: 'var(--rosso, #d6493b)', marginTop: 8, fontWeight: 600 }}>
                {errore}
              </div>
            )}
          </div>
        )}

        <div className="versione-footer">
          <button className="btn" onClick={conferma} type="button" disabled={invio}>
            {invio ? '…' : t('popupChiudi')}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
