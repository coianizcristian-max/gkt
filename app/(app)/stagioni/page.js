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

  const { data: stagioni } = await supabase
    .from('stagioni')
    .select('id, nome, societa_nome, attiva, data_inizio, data_fine')
    .eq('owner_id', ownerId)
    .order('data_inizio', { ascending: false, nullsFirst: false })

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
            Ogni stagione è legata a te e alla tua società: puoi avere stagioni diverse per squadre diverse,
            o creare una nuova stagione quando inizia un nuovo anno sportivo.
            La stagione <strong>attiva</strong> è quella usata da calendario, portieri, partite e statistiche.
            Puoi cambiare stagione attiva in qualsiasi momento — i dati delle altre stagioni restano conservati.
          </p>
          <p style={{marginTop:10}}>
            Per creare una nuova stagione (nuovo anno o nuova squadra) clicca <strong>&ldquo;+ Nuova stagione&rdquo;</strong> in alto a destra.
          </p>
        </Guida>
        <StagioniAllenatoreManager stagioni={stagioni ?? []} ownerId={ownerId} />
      </div>
    </>
  )
}
