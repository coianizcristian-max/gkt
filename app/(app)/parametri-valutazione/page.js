import { redirect } from 'next/navigation'
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
        <ParametriValutazioneManager parametri={parametri ?? []} attiviMap={attiviMap} />
      </div>
    </>
  )
}
