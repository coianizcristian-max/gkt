import { redirect } from 'next/navigation'
import Guida from '@/app/components/Guida'
import { createClient } from '@/lib/supabase/server'
import ParametriValutazioneManager from '@/app/components/ParametriValutazioneManager'

export const dynamic = 'force-dynamic'

export default async function ParametriValutazionePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const [{ data: parametri }, { data: selezione }] = await Promise.all([
    supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    supabase.from('allenatore_parametri').select('parametro_id, attivo').eq('allenatore_id', user.id),
  ])

  // Se l'allenatore non ha mai selezionato nulla, di default sono tutti attivi
  const haSelezione = (selezione ?? []).length > 0
  const attiviMap = {}
  if (haSelezione) {
    for (const p of parametri ?? []) attiviMap[p.id] = false
    for (const s of selezione) attiviMap[s.parametro_id] = s.attivo
  } else {
    for (const p of parametri ?? []) attiviMap[p.id] = true
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Parametri di valutazione</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano i parametri di valutazione">
          <p>
            I parametri di valutazione sono i criteri con cui valuti ogni portiere negli allenamenti (es. tecnica, uscite, gioco coi piedi, posizionamento).
            Qui puoi <strong>attivare o disattivare</strong> i parametri che vuoi usare: quelli attivi appaiono nella griglia di valutazione di ogni allenamento.
          </p>
          <p style={{marginTop:10}}>
            I parametri globali disponibili vengono gestiti dal <a href="/supervisore" className="link-inline">Supervisore</a>.
            La tua selezione qui è personale e non influenza gli altri allenatori.
            Puoi modificarla in qualsiasi momento: i dati già inseriti restano invariati.
          </p>
        </Guida>
        <ParametriValutazioneManager parametri={parametri ?? []} attiviMap={attiviMap} />
      </div>
    </>
  )
}
