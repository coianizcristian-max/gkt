import { Link } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import PortiereForm from '@/app/components/PortiereForm'
import OnboardingChecklist from '@/app/components/OnboardingChecklist'
import TagManager from '@/app/components/TagManager'
import AssenzePreviste from '@/app/components/AssenzePreviste'
import SchedaPortiereTabs from '@/app/components/SchedaPortiereTabs'
import InfortunioBox from '@/app/components/InfortunioBox'
import { getStagioneAttiva } from '@/lib/tenant'
import { contestoDati, entroTaglio } from '@/lib/demo'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SchedaPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations('schedaPortiere')
  const tp = await getTranslations('portieri')
  const c = await getTranslations('common')
  const user = await getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  // Il contesto va risolto PRIMA: le letture successive usano il suo client.
  const { db, stagione: selezionata, ownerId, taglio, oggi: oggiCtx, demo } = await contestoDati(supabase, user?.id)

  const [{ data: piediVoci }, { data: portiere }] = await Promise.all([
    supabase.from('elenco_voci').select('valore').eq('elenco', 'piede').eq('attivo', true).order('ordine'),
    db.from('portieri').select('*').eq('id', id).maybeSingle(),
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
      ? db.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id)
      : Promise.resolve(null),
    Promise.all([
      supabase.from('attributi_definizioni').select('*').eq('attivo', true).order('ordine'),
      db.from('portiere_attributi').select('attributo_id, valore_testo, valore_num').eq('portiere_id', id),
      db.from('portiere_tag').select('tag').eq('portiere_id', id),
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
    const { data: infA } = await db.from('infortuni')
      .select('id, data_inizio, data_rientro_prevista')
      .eq('iscrizione_id', iscrizione.id).is('data_fine', null).maybeSingle()
    infortunioAperto = infA ?? null
  }

  // Promemoria "allenamenti da valutare" — solo per il portiere sulla sua home.
  // Conta le sedute passate della sua categoria in cui è PRESENTE ma non ha
  // ancora dato il voto. Esclude assenze e sedute non ancora marcate dal coach.
  let daValutare = 0
  if (soloPortiere && stagione && iscrizione?.squadra_id) {
    const oggiRoma = oggiCtx
    const { data: allR } = await db.from('allenamenti')
      .select('id').eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id).lte('data', oggiRoma)
    const allIds = (allR ?? []).map((a) => a.id)
    if (allIds.length) {
      const { data: valR } = await db.from('valutazioni')
        .select('presente, voto_portiere').eq('portiere_id', id).in('allenamento_id', allIds)
      daValutare = (valR ?? []).filter((v) => v.presente === true && v.voto_portiere == null).length
    }
  }

  // Assenze annunciate (solo staff): promemoria informativo, mai in statistiche/presenze.
  let assenzePreviste = []
  if (!soloPortiere && iscrizione?.id) {
    const { data: apRows } = await db.from('assenze_previste')
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
        <div className="eyebrow">{soloPortiere ? tp('miaScheda') : <Link href="/portieri">{tp('titolo')}</Link>} · {c('stagione', { nome: stagione?.nome ?? '—' })}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        <div className="sub-nav">
          <Link href={`/portieri/${id}`} className="sub-nav-link active">{tp('navScheda')}</Link>
          {!soloPortiere && <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">{tp('navObiettivi')}</Link>}
          <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link">{tp('navStatistiche')}</Link>
      {!soloPortiere && <Link href={`/portieri/${id}/andamento`} className="sub-nav-link">{tp('navAndamento')}</Link>}
          {!soloPortiere && <Link href={`/portieri/${id}/percorso`} className="sub-nav-link">{tp('navPercorso')}</Link>}
        </div>
        {soloPortiere && daValutare > 0 && (
          <Link href="/calendario" className="scheda" style={{ display: 'block', marginBottom: 16, borderLeft: '4px solid var(--giallo)', textDecoration: 'none', color: 'inherit' }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>{t('daValutarePortiere', { n: daValutare })}</p>
          </Link>
        )}
        {!demo && soloPortiere && (
          <OnboardingChecklist checks={[
            {
              ok: !!(portiere.nome && portiere.cognome),
              titolo: t('onb1Titolo'),
              desc: t('onb1Desc'),
              href: `/portieri/${id}`,
            },
            {
              ok: !!portiere.foto_url,
              titolo: t('onb2Titolo'),
              desc: t('onb2Desc'),
              href: `/portieri/${id}`,
            },
            {
              ok: !!iscrizione,
              titolo: t('onb3Titolo'),
              desc: t('onb3Desc'),
              href: `/portieri/${id}`,
            },
          ]} />
        )}

        {(() => {
          const anagrafica = (
            <>
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
                <div className="empty">{c('setupStagioneCategoria')}</div>
              )}
            </>
          )
          // Staff con portiere iscritto: anagrafica e assenze in due sottoschede
          if (!soloPortiere && iscrizione?.id) {
            const nAss = (assenzePreviste ?? []).length
            return (
              <SchedaPortiereTabs
                etichette={{
                  anagrafica: tp('tabAnagrafica'),
                  infortuni: infortunioAperto ? `${tp('tabInfortuni')} ●` : tp('tabInfortuni'),
                  assenze: nAss ? `${tp('tabAssenze')} (${nAss})` : tp('tabAssenze'),
                }}
                infortunato={!!infortunioAperto}
                infortuni={<InfortunioBox iscrizioneId={iscrizione.id} infortunioAperto={infortunioAperto} />}
                anagrafica={anagrafica}
                assenze={<AssenzePreviste iscrizioneId={iscrizione.id} assenzeIniziali={assenzePreviste} />}
              />
            )
          }
          return anagrafica
        })()}
      </div>
    </>
  )
}
