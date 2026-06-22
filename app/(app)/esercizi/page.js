import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import EserciziManager from '@/app/components/EserciziManager'
import { getOwnerId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function EserciziPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const ownerId = await getOwnerId(supabase, user.id)
  const [{ data: esercizi }, { data: tip }] = await Promise.all([
    supabase.from('esercizi').select('*').eq('allenatore_id', ownerId).eq('archiviato', false).order('created_at', { ascending: false }),
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
        <Guida titolo="Come usare la libreria esercizi">
          Crea esercizi con titolo, tipologia, immagine e descrizione. Potrai richiamarli in ogni allenamento tramite il tab &ldquo;Libreria&rdquo; → &ldquo;La mia libreria&rdquo;.
          Se spunti &ldquo;Pubblico&rdquo; l&apos;esercizio sarà visibile e selezionabile anche dagli altri allenatori.
          Le tipologie vengono gestite da Supervisore → Elenchi.
        </Guida>
        <EserciziManager esercizi={esercizi ?? []} tipologie={tipologie} allenatoreId={ownerId} />
      </div>
    </>
  )
}
