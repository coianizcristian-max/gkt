'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Logout dopo 30 minuti SENZA attività (tocco/tasti/scroll/click).
// Chi sta lavorando non viene mai disconnesso: ogni interazione aggiorna
// l'orario dell'ultima attività.
//
// PERCHE' NON BASTA UN setTimeout (era il bug della versione precedente):
//  1. su mobile il sistema CONGELA i timer quando l'app va in secondo piano o
//     si spegne lo schermo. Due ore a schermo spento contavano zero.
//  2. 'visibilitychange' era fra gli eventi che azzeravano il timer, ma scatta
//     anche al RIENTRO nell'app: riaprendola ci si regalava mezz'ora nuova.
//     Cioe' il timeout veniva riavviato proprio quando doveva scattare.
//
// Qui la fonte della verita' e' un ORARIO salvato, non un conto alla rovescia:
// al rientro si confronta "adesso" con l'ultima attivita' e si decide. Il
// timer resta solo come rete per chi lascia la scheda aperta sul computer.
const LIMITE_MS = 30 * 60 * 1000
const CHIAVE = 'gkt-ultima-attivita'

export default function IdleLogout() {
  const timer = useRef(null)
  const uscendo = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // localStorage e non memoria: sopravvive a un ricaricamento della pagina
    // ed e' condiviso fra piu' schede aperte.
    const leggi = () => {
      try {
        const v = Number(window.localStorage.getItem(CHIAVE))
        return Number.isFinite(v) && v > 0 ? v : Date.now()
      } catch {
        return Date.now()
      }
    }
    const scrivi = (t) => {
      try { window.localStorage.setItem(CHIAVE, String(t)) } catch { /* modalita' privata */ }
    }

    const esci = async () => {
      if (uscendo.current) return
      uscendo.current = true
      clearTimeout(timer.current)
      try { window.localStorage.removeItem(CHIAVE) } catch {}
      try { await supabase.auth.signOut() } catch {}
      window.location.href = '/login?scaduto=1'
    }

    // Controlla il tempo trascorso e riarma la rete di sicurezza.
    const verifica = () => {
      const trascorso = Date.now() - leggi()
      if (trascorso >= LIMITE_MS) { esci(); return }
      clearTimeout(timer.current)
      timer.current = setTimeout(verifica, LIMITE_MS - trascorso)
    }

    // Attivita' vera dell'utente: aggiorna l'orario e riarma.
    const attivita = () => {
      if (uscendo.current) return
      scrivi(Date.now())
      clearTimeout(timer.current)
      timer.current = setTimeout(verifica, LIMITE_MS)
    }

    // NB: visibilitychange NON e' attivita'. Al rientro si VERIFICA soltanto.
    const alRientro = () => {
      if (document.visibilityState === 'visible') verifica()
    }

    const eventiAttivita = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll']
    eventiAttivita.forEach((e) => window.addEventListener(e, attivita, { passive: true }))
    document.addEventListener('visibilitychange', alRientro)
    window.addEventListener('focus', alRientro)
    // pageshow copre il ritorno dalla cache di navigazione di iOS, dove
    // visibilitychange a volte non scatta.
    window.addEventListener('pageshow', alRientro)

    // All'avvio: se l'orario c'e' gia' ed e' vecchio, si esce subito.
    // Se non c'e' (primo accesso), si parte da adesso.
    try {
      if (!window.localStorage.getItem(CHIAVE)) scrivi(Date.now())
    } catch {}
    verifica()

    return () => {
      clearTimeout(timer.current)
      eventiAttivita.forEach((e) => window.removeEventListener(e, attivita))
      document.removeEventListener('visibilitychange', alRientro)
      window.removeEventListener('focus', alRientro)
      window.removeEventListener('pageshow', alRientro)
    }
  }, [])

  return null
}
