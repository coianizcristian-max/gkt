import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AbbonamentiManager from '@/app/components/AbbonamentiManager'

export const dynamic = 'force-dynamic'

export default async function AbbonamentiSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // Carica tutti gli abbonamenti con dati allenatore (incluso il campo nota)
  const { data: abbRows } = await supabase
    .from('abbonamenti')
    .select('id, allenatore_id, piano, stato, scadenza, nota, created_at')
    .order('created_at', { ascending: false })

  // Carica profili allenatori
  const { data: profili } = await supabase
    .from('profili')
    .select('id, nome_visualizzato, nome_completo')
    .eq('ruolo', 'allenatore')
    .order('nome_visualizzato')

  // Email da auth.users tramite client admin (service role, solo server): serve
  // per poter cercare l'allenatore per email nella creazione manuale.
  // Se la chiave service role non è configurata, si degrada senza email (ricerca per nome/id).
  const emailById = {}
  try {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    let page = 1
    // Pagina finché ci sono utenti (perPage max 1000). Per basi utenti piccole basta 1 giro.
    while (page <= 5) {
      const { data: usersPage, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) break
      const users = usersPage?.users ?? []
      for (const u of users) emailById[u.id] = u.email
      if (users.length < 1000) break
      page += 1
    }
  } catch { /* niente email: la ricerca resterà su nome/id */ }

  const profiliConEmail = (profili ?? []).map((p) => ({ ...p, email: emailById[p.id] ?? null }))

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
          profili={profiliConEmail}
        />
      </div>
    </>
  )
}
