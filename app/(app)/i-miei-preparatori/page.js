import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import MieiPreparatoriClient from '@/app/components/MieiPreparatoriClient'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function MieiPreparatoriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .maybeSingle()

  if (profilo?.ruolo !== 'allenatore') redirect('/')

  const admin = getAdmin()

  // Leggi relazioni
  const { data: relazioni } = await admin
    .from('relazioni_supervisione')
    .select('id, preparatore_id, attivo, created_at, revocato_il')
    .eq('supervisore_id', user.id)
    .order('created_at', { ascending: false })

  let preparatori = []

  if (relazioni && relazioni.length > 0) {
    const ids = relazioni.map(r => r.preparatore_id)

    const [{ data: profili }, { data: stagioni }] = await Promise.all([
      admin.from('profili').select('id, nome_completo, foto_url, citta').in('id', ids),
      admin.from('stagioni').select('id, nome, owner_id').in('owner_id', ids).eq('stagione_corrente', true),
    ])

    preparatori = relazioni.map(rel => {
      const p = profili?.find(x => x.id === rel.preparatore_id) ?? {}
      const s = stagioni?.find(x => x.owner_id === rel.preparatore_id) ?? null
      return {
        relazione_id: rel.id,
        preparatore_id: rel.preparatore_id,
        attivo: rel.attivo,
        collegato_il: rel.created_at,
        revocato_il: rel.revocato_il,
        nome_completo: p.nome_completo ?? '(nessun nome)',
        foto_url: p.foto_url ?? null,
        citta: p.citta ?? null,
        stagione_attiva: s ? { id: s.id, nome: s.nome } : null,
      }
    })
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisione</div>
        <h1>I miei preparatori</h1>
      </div>
      <MieiPreparatoriClient preparatoriIniziali={preparatori} />
    </>
  )
}
