import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EserciziManager from '@/app/components/EserciziManager'

export const dynamic = 'force-dynamic'

export default async function EserciziPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const [{ data: esercizi }, { data: tip }] = await Promise.all([
    supabase.from('esercizi').select('*').eq('allenatore_id', user.id).order('created_at', { ascending: false }),
    supabase.from('elenco_voci').select('valore').eq('elenco', 'tipologie_esercizio').eq('attivo', true).order('ordine'),
  ])
  const tipologie = (tip ?? []).map((t) => t.valore)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Esercizi</h1>
      </div>
      <div className="content">
        <EserciziManager esercizi={esercizi ?? []} tipologie={tipologie} allenatoreId={user.id} />
      </div>
    </>
  )
}
