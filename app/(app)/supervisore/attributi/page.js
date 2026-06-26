import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AttributiEserciziManager from '@/app/components/AttributiEserciziManager'

export const dynamic = 'force-dynamic'

export default async function AttributiEserciziPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: attributi } = await supabase
    .from('attributi_esercizio').select('*').order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisore</div>
        <h1>Attributi esercizi</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <p className="sub-intro">
          Gli attributi descrivono le caratteristiche di un esercizio (es. Faticoso, Tecnico, Divertente).
          L&apos;allenatore può selezionarli quando crea un esercizio e filtrarli nella libreria.
        </p>
        <AttributiEserciziManager attributi={attributi ?? []} />
      </div>
    </>
  )
}
