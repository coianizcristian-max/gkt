import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AbbonatoClient from './AbbonatoClient'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'

export const dynamic = 'force-dynamic'

const DEFAULT_PREZZI = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

export default async function AbbonatiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
  const isPortiere = profilo?.ruolo === 'portiere'
  if (!isStaff && !isPortiere) redirect('/')

  const ruolo = isPortiere ? 'portiere' : 'allenatore'

  const { tuttoFree } = await getGatingConfig(supabase)
  if (tuttoFree) redirect('/')

  const abbonamentoAttivo = await hasAbbonamento(supabase, user.id)

  let abbonamento = null
  if (abbonamentoAttivo) {
    const { data } = await supabase.from('abbonamenti')
      .select('piano, stato, scadenza, created_at')
      .eq('allenatore_id', user.id).eq('stato', 'attivo').maybeSingle()
    abbonamento = data
  }

  // Leggi prezzi dal DB (chiavi: prezzo_{ruolo}_{piano})
  const chiavi = ['mensile', 'annuale', 'lifetime'].map((p) => `prezzo_${ruolo}_${p}`)
  const { data: prezziRows } = await supabase
    .from('funzionalita_config').select('chiave, label').in('chiave', chiavi)
  const prezziMap = {}
  for (const r of prezziRows ?? []) prezziMap[r.chiave] = r.label
  const prezzi = {
    mensile:  prezziMap[`prezzo_${ruolo}_mensile`]  ?? DEFAULT_PREZZI[ruolo].mensile,
    annuale:  prezziMap[`prezzo_${ruolo}_annuale`]  ?? DEFAULT_PREZZI[ruolo].annuale,
    lifetime: prezziMap[`prezzo_${ruolo}_lifetime`] ?? DEFAULT_PREZZI[ruolo].lifetime,
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Abbonamento GKT</h1>
      </div>
      <div className="content">
        <AbbonatoClient abbonamento={abbonamento} userId={user.id} prezzi={prezzi} ruolo={ruolo} />
      </div>
    </>
  )
}
