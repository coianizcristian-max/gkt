import { createClient } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import Suggerimenti from '@/app/components/Suggerimenti'

export const dynamic = 'force-dynamic'

export default async function SuggerimentiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profilo = null
  if (user) {
    const { data } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    profilo = data
  }
  const isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'

  let iniziali = []
  let miei = []

  if (isStaff) {
    // Staff: tutti i suggerimenti, con nome mittente (loggato) o nome/email (anonimo)
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, categoria, stato, created_at, utente_id, nome, email, profili(nome_visualizzato)')
      .order('created_at', { ascending: false })
    iniziali = (data ?? []).map((s) => ({
      ...s,
      mittente: s.profili?.nome_visualizzato ?? null,
    }))
  } else if (user) {
    // Portiere o utente loggato: solo i propri
    const { data } = await supabase
      .from('suggerimenti')
      .select('id, testo, categoria, stato, created_at')
      .eq('utente_id', user.id)
      .order('created_at', { ascending: false })
    miei = data ?? []
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">GKT</div>
        <h1>Suggerimenti e migliorie</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funziona questa sezione">
          <p>
            <strong>Per i portieri:</strong> invia proposte, segnalazioni o feedback allo staff tramite il form in fondo.
            Puoi scegliere la categoria (idea, bug, miglioramento…) e scrivere liberamente.
            Vedrai qui la risposta dello staff: <em>accettato</em>, <em>non accettato</em> o <em>in valutazione</em>.
            I suggerimenti possono essere inviati anche in forma anonima.
          </p>
          <p style={{marginTop:10}}>
            <strong>Per lo staff:</strong> questa pagina mostra tutti i suggerimenti ricevuti, con mittente (se loggato)
            o nome/email (se anonimo). Puoi cambiare lo stato di ogni suggerimento per far sapere al portiere
            come è stato preso in considerazione.
          </p>
        </Guida>
        <Suggerimenti isStaff={isStaff} isLoggedIn={!!user} iniziali={iniziali} miei={miei} />
      </div>
    </>
  )
}
