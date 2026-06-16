import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'

export const dynamic = 'force-dynamic'

export default async function NuovoPortierePage() {
  const supabase = await createClient()
  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let categorie = []
  if (stagione) {
    const { data } = await supabase
      .from('stagione_categorie')
      .select('squadre(id, nome, ordine)')
      .eq('stagione_id', stagione.id)
    categorie = (data ?? []).map((r) => r.squadre).filter(Boolean)
      .sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/portieri">Portieri</Link> · Stagione {stagione?.nome ?? '—'}</div>
        <h1>Nuovo portiere</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0 ? (
          <PortiereForm categorie={categorie} stagioneId={stagione.id} />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
      </div>
    </>
  )
}
