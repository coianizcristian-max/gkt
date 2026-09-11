import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations } from 'next-intl/server'
import RipristinoManager from '@/app/components/RipristinoManager'

export const dynamic = 'force-dynamic'

export default async function RipristinoPage() {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // Carica lista allenatori per il selettore utente
  const { data: allenatori } = await supabase
    .from('profili')
    .select('id, nome_visualizzato, nome_completo')
    .eq('ruolo', 'allenatore')
    .order('nome_visualizzato')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('titoloRipristino')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">{t('ripristinoIntro')}</p>
        <RipristinoManager allenatori={allenatori ?? []} />
      </div>
    </>
  )
}
