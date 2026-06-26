import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AbbonamentiManager from '@/app/components/AbbonamentiManager'

export const dynamic = 'force-dynamic'

export default async function AbbonamentiSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // Carica tutti gli abbonamenti con dati allenatore
  const { data: abbRows } = await supabase
    .from('abbonamenti')
    .select('id, allenatore_id, piano, stato, scadenza, created_at')
    .order('created_at', { ascending: false })

  // Carica profili allenatori
  const { data: profili } = await supabase
    .from('profili')
    .select('id, nome_visualizzato, nome_completo')
    .eq('ruolo', 'allenatore')
    .order('nome_visualizzato')

  // Carica email da auth.users tramite join profili
  const ids = (profili ?? []).map(p => p.id)
  let emails = {}
  if (ids.length) {
    // Usiamo una funzione RPC o leggiamo dalla tabella profili
    // email non è nella tabella profili ma possiamo usare la funzione admin
    // Per ora usiamo l'id come fallback
  }

  const totAttivi = (abbRows ?? []).filter(r => ['attivo', 'disdetto'].includes(r.stato)).length
  const totLifetime = (abbRows ?? []).filter(r => r.piano === 'lifetime').length

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisore</div>
        <h1>Gestione abbonamenti</h1>
      </div>
      <div className="content">
        <SupervisoreNav />

        {/* Statistiche */}
        <div className="scheda" style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{totAttivi}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Abbonamenti attivi</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{totLifetime}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Piani Lifetime</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{(abbRows ?? []).length}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Totale storici</div>
          </div>
        </div>

        <AbbonamentiManager
          abbonamenti={abbRows ?? []}
          profili={profili ?? []}
        />
      </div>
    </>
  )
}
