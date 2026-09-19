'use client'

import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

export default function SignOutButton() {
  const c = useTranslations('common')
  async function signOut() {
    const supabase = createClient()
    // solo questo dispositivo (il default 'global' chiuderebbe ogni sessione
    // dell'utente, e per l'account vetrina quelle di tutti i visitatori)
    await supabase.auth.signOut({ scope: 'local' })
    window.location.href = '/login'
  }
  return (
    <button className="signout" onClick={signOut}>{c('esci')}</button>
  )
}
