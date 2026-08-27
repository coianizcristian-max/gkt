import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import TagManager from '@/app/components/TagManager'
import AssenzePreviste from '@/app/components/AssenzePreviste'
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

  const [{ data: piediVoci }, { stagione: selezionata, ownerId }, { data: portiere }] = await Promise.all([
    supabase.from('elenco_voci').select('valore').eq('elenco', 'piede').eq('attivo', true).order('ordine'),
    getStagioneAttiva(supabase, user?.id),
    supabase.from('portieri').select('*').eq('id', id).maybeSingle(),
  ])
  const piedi = (piediVoci ?? []).map((v) => v.valore)
  if (!portiere) notFound()

  // ── Stagione della SCHEDA = quella in cui il portiere è ISCRITTO ───────────
  // Un coach può avere più stagioni attive insieme (più società). La scheda NON
  // deve seguire ciecamente la stagione selezionata in alto: se il portiere è di
  // un'altra stagione, scriverci sopra creerebbe un'iscrizione fantasma in quella
  // selezionata (upsert su portiere_id+stagione_id → INSERT). Regola:
  //   1) se il portiere è iscritto nella stagione SELEZIONATA → usa quella;
  //   2) altrimenti la stagione attiva più recente dove è davvero iscritto;
  //   3) se non è iscritto in nessuna stagione attiva → usa la selezionata
  //      (caso "nuova iscrizione" volontaria in questa stagione).
  let stagione = null
  let iscrizione = null
  if (ownerId) {
    const { data: stagioniAttive } = await supabase
      .from('stagioni').select('*')
      .eq('owner_id', ownerId).eq('attiva', true)
      .order('created_at', { ascending: false })
    const attive = stagioniAttive ?? []
    const attiveIds = attive.map((s) => s.id)

    let iscrizioniPortiere = []
    if (attiveIds.length) {
      const { data: iscr } = await supabase
        .from('iscrizioni').select('id, squadra_id, numero_maglia, stagione_id')
        .eq('portiere_id', id).in('stagione_id', attiveIds)
      iscrizioniPortiere = iscr ?? []
    }

    const selId = selezionata?.id
    if (selId && iscrizioniPortiere.some((i) => i.stagione_id === selId)) {
      stagione = attive.find((s) => s.id === selId) ?? selezionata
      iscrizione = iscrizioniPortiere.find((i) => i.stagione_id === selId) ?? null
    } else if (iscrizioniPortiere.length) {
      const s = attive.find((st) => iscrizioniPortiere.some((i) => i.stagione_id === st.id))
      stagione = s ?? null
      iscrizione = s ? (iscrizioniPortiere.find((i) => i.stagione_id === s.id) ?? null) : null
    } else {
      stagione = selezionata ?? null
      iscrizione = null
    }
  }

  // Categorie della stagione risolta + attributi/tag (indipendenti tra loro).
  const [catRes, attributiBatch] = await Promise.all([
    stagione
      ? supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id)
      : Promise.resolve(null),
    Promise.all([
      supabase.from('attributi_definizioni').select('*').eq('attivo', true).order('ordine'),
      supabase.from('portiere_attributi').select('attributo_id, valore_testo, valore_num').eq('portiere_id', id),
      supabase.from('portiere_tag').select('tag').eq('portiere_id', id),
      supabase.from('elenco_voci').select('valore').eq('elenco', 'tag_portiere').eq('attivo', true).order('ordine'),
    ]),
  ])

  let categorie = []
  if (catRes && catRes.data) {
    categorie = catRes.data.map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  // Infortunio aperto (senza data_fine) per l'iscrizione risolta.
  let infortunioAperto = null
  if (iscrizione?.id) {
    const { data: infA } = await supabase.from('infortuni')
      .select('id, data_inizio, data_rientro_prevista')
      .eq('iscrizione_id', iscrizione.id).is('data_fine', null).maybeSingle()
    infortunioAperto = infA ?? null
  }

  // Assenze annunciate (solo staff): promemoria informativo, mai in statistiche/presenze.
  let assenzePreviste = []
  if (!soloPortiere && iscrizione?.id) {
    const { data: apRows } = await supabase.from('assenze_previste')
      .select('id, data_inizio, data_fine, nota')
      .eq('iscrizione_id', iscrizione.id)
      .order('data_inizio', { ascending: true })
    assenzePreviste = apRows ?? []
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
            infortunioAperto={infortunioAperto}
          />
        ) : (
          <div className="empty">Imposta prima una stagione attiva e almeno una categoria.</div>
        )}
        {!soloPortiere && iscrizione?.id && (
          <AssenzePreviste iscrizioneId={iscrizione.id} assenzeIniziali={assenzePreviste} />
        )}
      </div>
    </>
  )
}
