import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvitiManager from '@/app/components/InvitiManager'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

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

  const { data: stagione } = await supabase.from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()
  let inviti = []
  let portieri = []
  if (stagione) {
    const [inv, isc] = await Promise.all([
      supabase.from('inviti').select('*').eq('stagione_id', stagione.id).order('created_at', { ascending: false }),
      supabase.from('iscrizioni').select('portieri(id, nome, cognome)').eq('stagione_id', stagione.id),
    ])
    inviti = inv.data ?? []
    portieri = (isc.data ?? []).map((r) => r.portieri).filter(Boolean).sort((a, b) => `${a.nome}`.localeCompare(`${b.nome}`))
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
