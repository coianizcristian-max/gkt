import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'
import SetupWizard from '@/app/components/SetupWizard'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const supabase = await createClient()
  const t = await getTranslations('setup')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (profilo?.ruolo !== 'allenatore') redirect('/dashboard')

  // Se ha già una stagione attiva non ha bisogno del wizard primo accesso
  const { stagione } = await getStagioneAttiva(supabase, user.id)
  if (stagione) redirect('/dashboard')

  const ownerId = await getOwnerId(supabase, user.id)

  const { data: anni } = await supabase
    .from('anni_stagione').select('id, nome')
    .eq('attivo', true).order('ordine', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <SetupWizard
          anniDisponibili={anni ?? []}
          ownerId={ownerId}
          redirectAfter="/portieri"
          isNuova={false}
        />
      </div>
    </>
  )
}
