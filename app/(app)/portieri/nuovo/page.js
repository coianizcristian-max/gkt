import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function NuovoPortierePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user?.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/dashboard')

  const { data: piediVoci } = await supabase
    .from('elenco_voci').select('valore').eq('elenco', 'piede').eq('attivo', true).order('ordine')
  const piedi = (piediVoci ?? []).map((v) => v.valore)
  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  let categorie = []
  if (stagione) {
    const { data } = await supabase
      .from('stagione_categorie')
      .select('squadre(id, nome, ordine)')
      .eq('stagione_id', stagione.id)
    categorie = (data ?? []).map((r) => r.squadre).filter(Boolean)
      .sort((a, b) => a.ordine - b.ordine)
  }

  const { data: attributiDef } = await supabase
    .from('attributi_definizioni').select('*').eq('attivo', true).order('ordine')

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href="/portieri">Portieri</Link> · Stagione {stagione?.nome ?? '—'}</div>
        <h1>Nuovo portiere</h1>
      </div>
      <div className="content">
        {stagione && categorie.length > 0 ? (
          <PortiereForm categorie={categorie} stagioneId={stagione.id} piedi={piedi} attributiDef={attributiDef ?? []} />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
      </div>
    </>
  )
}
