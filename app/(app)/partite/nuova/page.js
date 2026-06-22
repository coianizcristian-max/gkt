import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartitaForm from '@/app/components/PartitaForm'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function NuovaPartitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user?.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let categorie = []
  let avversari = []
  if (stagione) {
    const [cat, avv] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('squadre_avversarie').select('nome').eq('stagione_id', stagione.id),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    avversari = [...new Set((avv.data ?? []).map((r) => r.nome))]
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/partite">Partite</Link> &middot; Stagione {stagione?.nome ?? '\u2014'}</div>
        <h1>Nuova partita</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0
          ? <PartitaForm categorie={categorie} stagioneId={stagione.id} avversari={avversari} />
          : <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>}
      </div>
    </>
  )
}
