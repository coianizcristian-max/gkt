import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import TagManager from '@/app/components/TagManager'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function SchedaPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  // Le tre letture seguenti sono indipendenti tra loro (girano tutte solo dopo
  // il controllo di accesso sopra, quindi nessun rischio sull'eventuale
  // scrittura di fallback dentro getStagioneAttiva).
  const [{ data: piediVoci }, { stagione }, { data: portiere }] = await Promise.all([
    supabase.from('elenco_voci').select('valore').eq('elenco', 'piede').eq('attivo', true).order('ordine'),
    getStagioneAttiva(supabase, user?.id),
    supabase.from('portieri').select('*').eq('id', id).maybeSingle(),
  ])
  const piedi = (piediVoci ?? []).map((v) => v.valore)
  if (!portiere) notFound()

  // Blocco categorie/iscrizione (solo se c'e' una stagione) e blocco attributi/tag
  // (sempre) sono indipendenti l'uno dall'altro: prima giravano in due stadi
  // sequenziali, ora in un solo Promise.all.
  const [catIscRes, attributiBatch] = await Promise.all([
    stagione
      ? Promise.all([
          supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
          supabase.from('iscrizioni').select('squadra_id, numero_maglia')
            .eq('stagione_id', stagione.id).eq('portiere_id', id).maybeSingle(),
        ])
      : Promise.resolve(null),
    Promise.all([
      supabase.from('attributi_definizioni').select('*').eq('attivo', true).order('ordine'),
      supabase.from('portiere_attributi').select('attributo_id, valore_testo, valore_num').eq('portiere_id', id),
      supabase.from('portiere_tag').select('tag').eq('portiere_id', id),
      supabase.from('elenco_voci').select('valore').eq('elenco', 'tag_portiere').eq('attivo', true).order('ordine'),
    ]),
  ])

  let categorie = []
  let iscrizione = null
  if (catIscRes) {
    const [cat, isc] = catIscRes
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    iscrizione = isc.data
  }

  const [{ data: attributiDef }, { data: attributiRows }, { data: tagRows }, { data: tagVoci }] = attributiBatch
  const attributiValori = {}
  for (const r of attributiRows ?? []) attributiValori[r.attributo_id] = r.valore_testo ?? r.valore_num
  const tagAttivi = (tagRows ?? []).map((r) => r.tag)
  const tagDisponibili = (tagVoci ?? []).map((v) => v.valore)

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
          <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link">Statistiche</Link>
          <Link href={`/portieri/${id}/percorso`} className="sub-nav-link">Percorso</Link>
        </div>
        {soloPortiere && (
          <OnboardingChecklist checks={[
            {
              ok: !!(portiere.nome && portiere.cognome),
              titolo: 'Completa i tuoi dati',
              desc: 'Aggiungi nome, cognome e data di nascita nella tua scheda.',
              href: `/portieri/${id}`,
            },
            {
              ok: !!portiere.foto_url,
              titolo: 'Aggiungi una foto profilo',
              desc: 'Carica la tua foto per essere riconoscibile dallo staff.',
              href: `/portieri/${id}`,
            },
            {
              ok: !!iscrizione,
              titolo: 'Iscritto a una categoria',
              desc: 'Lo staff ti iscriverà alla categoria della stagione corrente.',
              href: `/portieri/${id}`,
            },
          ]} />
        )}

        {!soloPortiere && tagDisponibili.length > 0 && (
          <TagManager portiereId={id} tagAttivi={tagAttivi} tagDisponibili={tagDisponibili} />
        )}
        {stagione && categorie.length > 0 ? (
          <PortiereForm
            portiere={portiere}
            iscrizione={iscrizione}
            categorie={categorie}
            stagioneId={stagione.id}
            piedi={piedi}
            soloPortiere={soloPortiere}
            attributiDef={attributiDef ?? []}
            attributiValori={attributiValori}
          />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
      </div>
    </>
  )
}