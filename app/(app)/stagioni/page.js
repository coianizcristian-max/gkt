import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnerId } from '@/lib/tenant'
import Link from 'next/link'
import StagioniAllenatoreManager from '@/app/components/StagioniAllenatoreManager'
import Guida from '@/app/components/Guida'

export const dynamic = 'force-dynamic'

export default async function StagioniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const ownerId = await getOwnerId(supabase, user.id)

  const [{ data: stagioni }, { data: profiloCorrente }] = await Promise.all([
    supabase.from('stagioni')
      .select('id, nome, societa_nome, attiva, data_inizio, data_fine')
      .eq('owner_id', ownerId)
      .order('data_inizio', { ascending: false, nullsFirst: false }),
    supabase.from('profili').select('stagione_corrente_id').eq('id', user.id).maybeSingle(),
  ])

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Area riservata</div>
          <h1>Le mie stagioni</h1>
        </div>
        <Link href="/stagioni/nuova" className="btn-azione">+ Nuova stagione</Link>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano le stagioni">
          <p>
            Puoi tenere <strong>più stagioni attive in parallelo</strong> — per esempio una per ogni società
            con cui collabori — ognuna con le proprie categorie, calendario, portieri e statistiche
            completamente separati. Non serve chiuderne una per lavorare su un&apos;altra.
          </p>
          <p style={{marginTop:10}}>
            La stagione su cui stai lavorando in questo momento (la tua &ldquo;<strong>corrente</strong>&rdquo;)
            si vede anche in alto a sinistra nel menu: usa quel selettore rapido per passare da una stagione
            attiva all&apos;altra in qualsiasi momento, senza doverle disattivare a vicenda.
          </p>
          <p style={{marginTop:10}}>
            Per creare una nuova stagione (nuovo anno o nuova società) clicca <strong>&ldquo;+ Nuova stagione&rdquo;</strong> in alto a destra.
          </p>
        </Guida>
        <StagioniAllenatoreManager stagioni={stagioni ?? []} ownerId={ownerId} stagioneCorrenteId={profiloCorrente?.stagione_corrente_id ?? null} />
      </div>
    </>
  )
}
