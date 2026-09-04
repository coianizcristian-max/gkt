import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import AbbonamentiTabs from '@/app/components/AbbonamentiTabs'
import { ALBERO_FUNZIONALITA } from '@/lib/gating'

export const dynamic = 'force-dynamic'

export default async function AbbonamentiSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // ── Dati "Prezzi & funzionalità" (ex pagina Funzionalità) ──────────────────
  const { data: cfgRows } = await supabase.from('funzionalita_config').select('chiave, free, label')
  const configMap = {}
  const labelMap = {}
  for (const r of cfgRows ?? []) { configMap[r.chiave] = r.free; labelMap[r.chiave] = r.label }
  const tuttoFree = configMap['__tutto_free'] ?? false
  const getL = (k, def) => labelMap[k] ?? def
  const feeContatto = getL('fee_contatto_importo', '2.90')
  const prezziIniziali = {
    allenatore: {
      mensile:  getL('prezzo_allenatore_mensile',  '9.90'),
      annuale:  getL('prezzo_allenatore_annuale',  '79.00'),
      lifetime: getL('prezzo_allenatore_lifetime', '199.00'),
    },
    portiere: {
      mensile:  getL('prezzo_portiere_mensile',  '4.90'),
      annuale:  getL('prezzo_portiere_annuale',  '39.00'),
      lifetime: getL('prezzo_portiere_lifetime', '99.00'),
    },
  }
  const giorniIniziali = {
    allenatore: getL('giorni_prova_allenatore', '30'),
    portiere:   getL('giorni_prova_portiere',   '30'),
  }
  const conValori = (nodo) => ({
    chiave: nodo.chiave,
    label: nodo.label,
    free: configMap[nodo.chiave] ?? nodo.defaultFree,
    ...(nodo.figli ? { figli: nodo.figli.map(conValori) } : {}),
  })
  const albero = ALBERO_FUNZIONALITA.map((s) => ({
    sezione: s.sezione,
    funzionalita: s.funzionalita.map(conValori),
  }))
  const gating = { albero, tuttoFree, feeContatto, prezziIniziali, giorniIniziali }

  // ── Dati "Abbonamenti manuali" ─────────────────────────────────────────────
  const { data: abbRows } = await supabase
    .from('abbonamenti')
    .select('id, allenatore_id, piano, stato, scadenza, nota, created_at')
    .order('created_at', { ascending: false })

  const { data: profili } = await supabase
    .from('profili')
    .select('id, nome_visualizzato, nome_completo')
    .eq('ruolo', 'allenatore')
    .order('nome_visualizzato')

  const emailById = {}
  try {
    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    let page = 1
    while (page <= 5) {
      const { data: usersPage, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) break
      const users = usersPage?.users ?? []
      for (const u of users) emailById[u.id] = u.email
      if (users.length < 1000) break
      page += 1
    }
  } catch { /* niente email: ricerca per nome/id */ }

  const profiliConEmail = (profili ?? []).map((p) => ({ ...p, email: emailById[p.id] ?? null }))

  const stats = {
    attivi:   (abbRows ?? []).filter(r => ['attivo', 'disdetto'].includes(r.stato)).length,
    lifetime: (abbRows ?? []).filter(r => r.piano === 'lifetime').length,
    totali:   (abbRows ?? []).length,
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisore</div>
        <h1>Abbonamenti</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <AbbonamentiTabs
          gating={gating}
          abbonamenti={abbRows ?? []}
          profili={profiliConEmail}
          stats={stats}
        />
      </div>
    </>
  )
}
