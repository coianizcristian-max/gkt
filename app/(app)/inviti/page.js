import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import InvitiManager from '@/app/components/InvitiManager'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function InvitiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  const canInviti = isUnlocked('inviti_creazione', gatingCfg, abbAttivo)

  const { stagione } = await getStagioneAttiva(supabase, user.id)
  let inviti = []
  let portieri = []
  if (stagione) {
    const [inv, isc] = await Promise.all([
      supabase.from('inviti').select('*').eq('stagione_id', stagione.id).order('created_at', { ascending: false }),
      supabase.from('iscrizioni').select('portieri(id, nome, cognome)').eq('stagione_id', stagione.id),
    ])
    inviti = inv.data ?? []
    portieri = (isc.data ?? []).map((r) => r.portieri).filter(Boolean).sort((a, b) => `${a.nome}`.localeCompare(`${b.nome}`))

    // Arricchisci gli inviti di tipo 'preparatore' con il nome di chi li ha consumati
    const consumatiIds = inviti
      .filter(i => i.tipo === 'preparatore' && i.consumato_da)
      .map(i => i.consumato_da)
    if (consumatiIds.length > 0) {
      const admin = getAdmin()
      const { data: profiliConsumatori } = await admin
        .from('profili')
        .select('id, nome_completo')
        .in('id', consumatiIds)
      const nomiMap = {}
      for (const p of profiliConsumatori ?? []) nomiMap[p.id] = p.nome_completo
      inviti = inviti.map(i =>
        i.tipo === 'preparatore' && i.consumato_da
          ? { ...i, nome_consumatore: nomiMap[i.consumato_da] ?? null }
          : i
      )
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
        <h1>Inviti</h1>
      </div>
      <div className="content">
        {!canInviti
          ? <PaywallBanner chiave="inviti_creazione" label="Creazione link di invito" />
          : stagione
            ? <InvitiManager inviti={inviti} portieri={portieri} stagioneId={stagione.id} />
            : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
