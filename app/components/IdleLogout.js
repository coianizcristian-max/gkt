'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Logout dopo 30 minuti SENZA attività (mouse/tocco/tasti/scroll).
// Chi sta lavorando non viene mai disconnesso: il timer si azzera a ogni
// interazione. Così gli utenti rifanno il login almeno una volta al giorno.
const LIMITE_MS = 30 * 60 * 1000

export default function IdleLogout() {
  const timer = useRef(null)

  useEffect(() => {
    const supabase = createClient()
    const reset = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await supabase.auth.signOut()
        window.location.href = '/login?scaduto=1'
      }, LIMITE_MS)
    }
    const eventi = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll', 'visibilitychange']
    eventi.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer.current)
      eventi.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  return null
}
