import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'

export const dynamic = 'force-dynamic'

export default async function SchedaPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  const { data: portiere } = await supabase
    .from('portieri').select('*').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  let categorie = []
  let iscrizione = null
  if (stagione) {
    const [cat, isc] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('iscrizioni').select('squadra_id, numero_maglia')
        .eq('stagione_id', stagione.id).eq('portiere_id', id).maybeSingle(),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    iscrizione = isc.data
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/portieri">Portieri</Link> · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0 ? (
          <PortiereForm
            portiere={portiere}
            iscrizione={iscrizione}
            categorie={categorie}
            stagioneId={stagione.id}
          />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
      </div>
    </>
  )
}
