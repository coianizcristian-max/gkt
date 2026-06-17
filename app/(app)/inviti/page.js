import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvitiManager from '@/app/components/InvitiManager'

export const dynamic = 'force-dynamic'

export default async function InvitiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

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
        <div className="eyebrow">Stagione {stagione?.nome ?? '\u2014'}</div>
        <h1>Inviti</h1>
      </div>
      <div className="content">
        {stagione
          ? <InvitiManager inviti={inviti} portieri={portieri} stagioneId={stagione.id} />
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}
