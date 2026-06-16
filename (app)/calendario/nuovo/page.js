import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AllenamentoForm from '@/app/components/AllenamentoForm'

export const dynamic = 'force-dynamic'

export default async function NuovoAllenamentoPage({ searchParams }) {
  const sp = await searchParams
  const defaultData = sp?.data ?? ''
  const supabase = await createClient()
  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let categorie = []
  if (stagione) {
    const { data } = await supabase.from('stagione_categorie')
      .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id)
    categorie = (data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/calendario">Calendario</Link> · Stagione {stagione?.nome ?? '—'}</div>
        <h1>Nuovo allenamento</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0
          ? <AllenamentoForm categorie={categorie} stagioneId={stagione.id} defaultData={defaultData} />
          : <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>}
      </div>
    </>
  )
}
