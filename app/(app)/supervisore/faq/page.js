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
          Le domande sono organizzate in due schede (Allenatori/staff e Portieri), e dentro ognuna in
          categorie — usa &ldquo;+ Nuova categoria&rdquo; per crearne una nuova, oppure seleziona una
          categoria esistente per vedere e modificare solo le sue domande. Il campo &ldquo;Posizione&rdquo;
          decide l&apos;ordine delle domande dentro la categoria.
        </p>
        <FaqManager faq={faq ?? []} />
      </div>
    </>
  )
}
