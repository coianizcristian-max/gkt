'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { trackEvento } from '@/app/components/PostHogProvider'

// ---------------------------------------------------------------------------
// GKSeason — captcha con Cloudflare Turnstile.
//
// PERCHE' AL POSTO DI hCAPTCHA: sul piano gratuito hCaptcha non permette la
// modalita' passiva. I quattro livelli di difficolta' (Easy/Medium/Difficult/
// Auto) decidono QUANTO sono difficili i rompicapo, non SE appaiono: la
// verifica senza immagini e' riservata ai piani a pagamento. Turnstile fa lo
// stesso lavoro senza mai mostrare rompicapo, ed e' supportato nativamente da
// Supabase Auth.
//
// INTERFACCIA VOLUTAMENTE IDENTICA a @hcaptcha/react-hcaptcha:
//   <Captcha ref={r} sitekey={...} onVerify={tok => ...} onExpire={() => ...} />
//   r.current.resetCaptcha()
// Cosi' le pagine login e registrati cambiano di due righe, e tornare indietro
// e' altrettanto rapido.
//
// Niente pacchetti nuovi: si carica lo script ufficiale e si usa l'API di
// rendering esplicito. Una dipendenza in meno da mantenere.
// ---------------------------------------------------------------------------

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let promessaScript = null
function caricaScript() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (promessaScript) return promessaScript

  promessaScript = new Promise((risolvi, rifiuta) => {
    const esistente = document.querySelector(`script[src="${URL_SCRIPT}"]`)
    if (esistente) {
      esistente.addEventListener('load', () => risolvi(window.turnstile))
      esistente.addEventListener('error', rifiuta)
      return
    }
    const s = document.createElement('script')
    s.src = URL_SCRIPT
    s.async = true
    s.defer = true
    s.onload = () => risolvi(window.turnstile)
    s.onerror = () => rifiuta(new Error('Turnstile non caricato'))
    document.head.appendChild(s)
  })
  return promessaScript
}

const Captcha = forwardRef(function Captcha(
  { sitekey, onVerify, onExpire, theme = 'light', action },
  ref
) {
  const t = useTranslations('common')
  const contenitore = useRef(null)
  const idWidget = useRef(null)
  const [errore, setErrore] = useState(false)
  // un solo evento per montaggio: se il widget riprova da solo non vogliamo
  // decine di eventi identici che falsano il conteggio in PostHog
  const erroreTracciato = useRef(false)

  // i callback in un ref: cosi' il widget si crea UNA volta sola e non si
  // ricrea a ogni render del form (che azzererebbe il token gia' ottenuto)
  const callbacks = useRef({ onVerify, onExpire })
  callbacks.current = { onVerify, onExpire }

  // Registra il problema una volta sola. Serve a sapere QUANTE persone
  // restano davvero bloccate qui: senza questo, un utente che non riesce a
  // entrare per colpa del captcha e' invisibile.
  function segnalaProblema(motivo, codice) {
    setErrore(true)
    callbacks.current.onExpire?.()
    if (erroreTracciato.current) return
    erroreTracciato.current = true
    try {
      trackEvento('captcha_errore', {
        motivo,
        codice: codice ?? null,
        pagina: typeof window !== 'undefined' ? window.location.pathname : null,
      })
    } catch { /* il tracciamento non deve mai rompere il login */ }
  }

  useImperativeHandle(ref, () => ({
    // stesso nome del metodo di hCaptcha, per non cambiare le pagine
    resetCaptcha() {
      try {
        if (window.turnstile && idWidget.current !== null) {
          window.turnstile.reset(idWidget.current)
        }
      } catch { /* widget non ancora pronto: niente da azzerare */ }
    },
  }))

  useEffect(() => {
    let annullato = false
    if (!sitekey) return

    caricaScript()
      .then((turnstile) => {
        if (annullato || !turnstile || !contenitore.current) return
        if (idWidget.current !== null) return // gia' montato
        idWidget.current = turnstile.render(contenitore.current, {
          sitekey,
          theme,
          action,
          callback: (token) => callbacks.current.onVerify?.(token),
          'expired-callback': () => callbacks.current.onExpire?.(),
          'timeout-callback': () => callbacks.current.onExpire?.(),
          // Turnstile passa un codice di errore: lo registriamo per capire
          // se e' rete, browser o blocco di un'estensione.
          'error-callback': (codice) => segnalaProblema('widget', codice),
        })
      })
      .catch(() => segnalaProblema('script_non_caricato'))

    return () => {
      annullato = true
      try {
        if (window.turnstile && idWidget.current !== null) {
          window.turnstile.remove(idWidget.current)
        }
      } catch { /* niente da rimuovere */ }
      idWidget.current = null
    }
  }, [sitekey, theme, action])

  if (!sitekey) return null

  return (
    <div>
      <div ref={contenitore} />
      {errore && (
        <p style={{ fontSize: 13, color: 'var(--rosso, #c0392b)', margin: '8px 0 0', textAlign: 'center' }}>
          {t('captchaNonDisponibile')}
        </p>
      )}
    </div>
  )
})

export default Captcha
