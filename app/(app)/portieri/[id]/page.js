import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'

export const dynamic = 'force-dynamic'

export default async function SchedaPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'

  const { data: piediVoci } = await supabase
    .from('elenco_voci').select('valore').eq('elenco', 'piede').eq('attivo', true).order('ordine')
  const piedi = (piediVoci ?? []).map((v) => v.valore)

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
        <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        <div className="sub-nav">
          <Link href={`/portieri/${id}`} className="sub-nav-link active">Scheda</Link>
          <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">Obiettivi</Link>
        </div>
        {stagione && categorie.length > 0 ? (
          <PortiereForm
            portiere={portiere}
            iscrizione={iscrizione}
            categorie={categorie}
            stagioneId={stagione.id}
            piedi={piedi}
            soloPortiere={soloPortiere}
          />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
      </div>
    </>
  )
}