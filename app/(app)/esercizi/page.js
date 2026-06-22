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

  // Esercizi pubblici preferiti — query separata con gestione errore
  // (la tabella esercizi_preferiti potrebbe non esistere se il SQL non è ancora stato eseguito)
  let eserciziPubbliciPreferiti = []
  try {
    const { data: prefRows, error: prefErr } = await supabase
      .from('esercizi_preferiti').select('esercizio_id').eq('allenatore_id', user.id)
    if (!prefErr && prefRows && prefRows.length > 0) {
      const prefIds = prefRows.map((r) => r.esercizio_id)
      const { data: pubPref } = await supabase
        .from('esercizi')
        .select('*')
        .eq('pubblico', true)
        .eq('archiviato', false)
        .neq('allenatore_id', ownerId)
        .in('id', prefIds)
        .order('titolo')
      eserciziPubbliciPreferiti = pubPref ?? []
    }
  } catch (_) {
    // Tabella non ancora creata — funziona comunque senza preferiti pubblici
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Esercizi</h1>
      </div>
      <div className="content">
        <Guida titolo="Come usare la libreria esercizi">
          Qui trovi i tuoi esercizi privati. Se spunti &ldquo;Pubblico&rdquo; su un esercizio lo rendi visibile agli altri allenatori.
          Nella sezione &ldquo;Pubblici preferiti&rdquo; trovi gli esercizi di altri allenatori che hai salvato con ★ dalla libreria pubblica.
          Le tipologie vengono gestite da Supervisore → Elenchi.
        </Guida>
        <EserciziManager
          esercizi={esercizi ?? []}
          eserciziPubblici={eserciziPubbliciPreferiti}
          tipologie={tipologie}
          allenatoreId={ownerId}
        />
      </div>
    </>
  )
}
