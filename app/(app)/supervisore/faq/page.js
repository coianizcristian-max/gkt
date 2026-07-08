import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import FaqManager from '@/app/components/FaqManager'

export const dynamic = 'force-dynamic'

export default async function SupervisoreFaqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: faq } = await supabase
    .from('faq_interne').select('*').order('target').order('categoria').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">
          Gestisci le domande frequenti mostrate nella pagina &ldquo;Domande frequenti&rdquo; dell&apos;area
          riservata (allenatori/staff e portieri vedono elenchi diversi). Il campo &ldquo;Categoria&rdquo;
          raggruppa le domande sotto lo stesso titolo — usa lo stesso testo esatto di una categoria
          esistente per aggiungere una domanda a un gruppo già presente.
        </p>
        <FaqManager faq={faq ?? []} />
      </div>
    </>
  )
}
