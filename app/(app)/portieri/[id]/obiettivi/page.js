import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ObiettiviManager from '@/app/components/ObiettiviManager'

export const dynamic = 'force-dynamic'

export default async function ObiettiviPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { data: stagione } = await supabase.from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  const { data: obiettivi } = await supabase.from('obiettivi')
    .select('*').eq('portiere_id', id).order('created_at', { ascending: false })

  const obIds = (obiettivi ?? []).map((o) => o.id)
  const sottoByObiettivo = {}
  if (obIds.length) {
    const { data: sotto } = await supabase.from('sotto_obiettivi')
      .select('*').in('obiettivo_id', obIds).order('ordine')
    for (const so of sotto ?? []) (sottoByObiettivo[so.obiettivo_id] ??= []).push(so)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/portieri">Portieri</Link> · {portiere.nome} {portiere.cognome ?? ''}</div>
        <h1>Obiettivi</h1>
      </div>
      <div className="content">
        <div className="sub-nav">
          <Link href={`/portieri/${id}`} className="sub-nav-link">Scheda</Link>
          <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link active">Obiettivi</Link>
        </div>
        <ObiettiviManager
          portiereId={id}
          stagioneId={stagione?.id ?? null}
          obiettivi={obiettivi ?? []}
          sottoByObiettivo={sottoByObiettivo}
        />
      </div>
    </>
  )
}
