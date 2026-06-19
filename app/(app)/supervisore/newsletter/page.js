import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import NewsletterManager from '@/app/components/NewsletterManager'

export const dynamic = 'force-dynamic'

export default async function NewsletterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const [{ data: invii }, { data: iscritti }] = await Promise.all([
    supabase.from('newsletter_invii').select('*').order('created_at', { ascending: false }),
    supabase.from('newsletter_iscritti').select('id, email, attivo').order('created_at', { ascending: false }),
  ])

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Newsletter</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <NewsletterManager invii={invii ?? []} iscritti={iscritti ?? []} />
      </div>
    </>
  )
}
