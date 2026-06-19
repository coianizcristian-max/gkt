import Link from 'next/link'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortieriSearch from '@/app/components/PortieriSearch'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'

export const dynamic = 'force-dynamic'

export default async function PortieriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  if (profilo?.ruolo === 'portiere' && profilo.portiere_id) {
    redirect(`/portieri/${profilo.portiere_id}`)
  }

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let squadre = []
  let iscrizioni = []
  let valutazioni = []

  let haCategorie = false
  let haPortieri = false
  let haAllenamenti = false
  if (stagione) {
    const [sq, isc, val, cat, allen] = await Promise.all([
      supabase.from('squadre').select('id, nome, ordine').order('ordine'),
      supabase.from('iscrizioni')
        .select('squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url, attivo, data_nascita)')
        .eq('stagione_id', stagione.id),
      supabase.from('valutazioni').select('portiere_id, presente, voto'),
      supabase.from('stagione_categorie').select('id').eq('stagione_id', stagione.id).limit(1),
      supabase.from('allenamenti').select('id').eq('stagione_id', stagione.id).limit(1),
    ])
    squadre = sq.data ?? []
    iscrizioni = isc.data ?? []
    valutazioni = val.data ?? []
    haCategorie = (cat.data ?? []).length > 0
    haPortieri = iscrizioni.filter((i) => i.portieri?.attivo).length > 0
    haAllenamenti = (allen.data ?? []).length > 0
  }

  const stats = {}
  for (const v of valutazioni) {
    const s = (stats[v.portiere_id] ??= { tot: 0, presenze: 0, somma: 0, conta: 0 })
    s.tot += 1
    if (v.presente) s.presenze += 1
    if (v.presente && v.voto != null) { s.somma += Number(v.voto); s.conta += 1 }
  }

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Portieri</h1>
        </div>
        <Link href="/portieri/nuovo" className="btn-azione">+ Nuovo</Link>
      </div>
      <div className="content">
        <Guida titolo="Come gestire i portieri">
          Aggiungi i portieri con &ldquo;+ Nuovo&rdquo; e iscrivili a una categoria della stagione attiva.
          Per mandare l&apos;accesso al portiere usa la sezione <a href="/inviti" className="link-inline">Inviti</a>.
        </Guida>
        {profilo?.ruolo === 'allenatore' && (
          <OnboardingChecklist checks={[
            {
              ok: !!stagione,
              titolo: 'Stagione attiva',
              desc: 'Crea e attiva una stagione in Supervisore.',
              href: '/supervisore/stagioni',
            },
            {
              ok: haCategorie,
              titolo: 'Almeno una categoria',
              desc: 'Aggiungi le categorie (Under 15, Under 17…) alla stagione.',
              href: '/supervisore/categorie',
            },
            {
              ok: haPortieri,
              titolo: 'Portieri iscritti',
              desc: 'Aggiungi i tuoi portieri e iscrivili a una categoria.',
              href: '/portieri/nuovo',
            },
            {
              ok: haAllenamenti,
              titolo: 'Primo allenamento',
              desc: 'Crea il primo allenamento dal calendario o configura le ricorrenze.',
              href: '/calendario',
            },
          ]} />
        )}
        {!stagione
          ? <div className="empty">Nessuna stagione attiva. <Link href="/supervisore/stagioni" className="link-inline">Crea una stagione</Link></div>
          : <PortieriSearch squadre={squadre} iscrizioni={iscrizioni} stats={stats} />}
      </div>
    </>
  )
}
