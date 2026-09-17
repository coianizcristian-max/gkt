'use client'

import { useEffect } from 'react'
import { trackEvento } from '@/app/components/PostHogProvider'
import { trackMetaEvento } from '@/app/components/MetaPixel'
import { leggiAttribuzione } from '@/app/components/AttribuzioneUtm'

const CHIAVE = 'gk_demo_aperta_inviata'

/**
 * Invia l'evento "demo aperta" quando un visitatore arriva da /d.
 *
 * A cosa serve: e' l'evento intermedio su cui ottimizzare le campagne Meta.
 * La registrazione e' troppo rara perche' l'algoritmo esca dalla fase di
 * apprendimento (servono ~50 conversioni a settimana per gruppo di
 * inserzioni); l'ingresso in demo ha molto piu' volume ed e' comunque un
 * segnale di intenzione forte.
 *
 * Viene montato SOLO per gli ospiti arrivati da /d, mai per i preparatori
 * registrati che entrano in demo dal menu: quelli sporcherebbero il segnale
 * su cui Meta impara chi cercare.
 *
 * Parte una volta per sessione del browser, non a ogni cambio pagina.
 *
 * Il Pixel rispetta gia' il consenso cookie: trackMetaEvento non fa nulla
 * finche' l'utente non ha accettato, quindi non serve gestirlo qui.
 */
export default function DemoTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHIAVE) === '1') return
      sessionStorage.setItem(CHIAVE, '1')
    } catch {
      // se sessionStorage non e' disponibile mandiamo comunque l'evento:
      // meglio un doppione che perdere la conversione
    }

    const attribuzione = leggiAttribuzione() || {}

    // Evento personalizzato Meta: e' quello da selezionare come conversione
    // quando crei la campagna in Gestione inserzioni.
    trackMetaEvento('DemoAperta', {
      fonte: attribuzione.utm_source || 'diretto',
      mezzo: attribuzione.utm_medium || null,
      campagna: attribuzione.utm_campaign || null,
    })

    // Stesso evento su PostHog, dove puoi vedere l'imbuto completo
    // (demo aperta -> pagine viste -> newsletter -> registrazione).
    trackEvento('demo_aperta_ospite', attribuzione)
  }, [])

  return null
}
