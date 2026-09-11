import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'
import SetupWizard from '@/app/components/SetupWizard'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function NuovaStagioneAllenatorePage() {
  const supabase = await createClient()
  const t = await getTranslations('stagioni')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const ownerId = await getOwnerId(supabase, user.id)

  const { data: anni } = await supabase
    .from('anni_stagione').select('id, nome')
    .eq('attivo', true).order('ordine', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('titolo')}</div>
        <h1>{t('nuovaTitolo')}</h1>
      </div>
      <div className="content">
        <SetupWizard
          anniDisponibili={anni ?? []}
          ownerId={ownerId}
          redirectAfter="/stagioni"
          isNuova={true}
        />
      </div>
    </>
  )
}
