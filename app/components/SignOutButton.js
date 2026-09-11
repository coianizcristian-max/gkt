'use client'

import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

export default function SignOutButton() {
  const c = useTranslations('common')
  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  return (
    <button className="signout" onClick={signOut}>{c('esci')}</button>
  )
}
