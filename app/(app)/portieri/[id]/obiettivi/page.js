import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ObiettiviManager from '@/app/components/ObiettiviManager'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { getStagioneAttiva, getOwnerId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function ObiettiviPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  if (profiloViewer?.ruolo === 'portiere' && profiloViewer.portiere_id !== id) notFound()

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  const { data: obiettivi } = await supabase.from('obiettivi')
    .select('*').eq('portiere_id', id).eq('archiviato', false).order('created_at', { ascending: false })

  // Proposte di obiettivo personale (tab dedicato): sia il portiere sia lo staff
  // possono inserirle; lo stato (✔/✘) lo decide solo lo staff.
  const { data: proposte } = await supabase.from('proposte_obiettivi')
    .select('*').eq('portiere_id', id).order('created_at', { ascending: false })

  const obIds = (obiettivi ?? []).map((o) => o.id)
  const sottoByObiettivo = {}
  if (obIds.length) {
    const { data: sotto } = await supabase.from('sotto_obiettivi')
      .select('*').in('obiettivo_id', obIds).order('ordine')
    for (const so of sotto ?? []) (sottoByObiettivo[so.obiettivo_id] ??= []).push(so)
  }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canObiettivi = isUnlocked('obiettivi_portieri', gatingCfg, abbAttivo)

  // ── Dati per collegamenti e trend automatico (solo se ci sono obiettivi e funzionalità sbloccata) ──
  let parametriTutti = []
  let eserciziTutti = []
  let collegamentiPerObiettivo = {}
  let trendPerObiettivo = {}

  if (canObiettivi && obIds.length > 0) {
    const ownerId = await getOwnerId(supabase, user?.id)
    const [{ data: parRows }, { data: esRows }, { data: obParRows }, { data: obEsRows }] = await Promise.all([
      supabase.from('parametri_valutazione').select('id, nome').eq('attivo', true).order('ordine'),
      supabase.from('esercizi').select('id, titolo').eq('allenatore_id', ownerId).eq('archiviato', false).order('titolo'),
      supabase.from('obiettivo_parametri').select('obiettivo_id, parametro_id, parametri_valutazione(nome)').in('obiettivo_id', obIds),
      supabase.from('obiettivo_esercizi').select('obiettivo_id, esercizio_id').in('obiettivo_id', obIds),
    ])
    parametriTutti = parRows ?? []
    eserciziTutti = esRows ?? []

    // Collegamenti esistenti, raggruppati per obiettivo
    for (const r of obParRows ?? []) {
      (collegamentiPerObiettivo[r.obiettivo_id] ??= { parametri: [], esercizi: [] }).parametri.push(r.parametro_id)
    }
    for (const r of obEsRows ?? []) {
      (collegamentiPerObiettivo[r.obiettivo_id] ??= { parametri: [], esercizi: [] }).esercizi.push(r.esercizio_id)
    }

    // ── Calcolo trend: per ogni obiettivo, per ogni parametro collegato,
    //    prendi tutti i punteggi storici di quel portiere su quel parametro, in ordine cronologico
    const parametroIdsCollegati = [...new Set((obParRows ?? []).map((r) => r.parametro_id))]
    if (parametroIdsCollegati.length > 0) {
      // Tutte le valutazioni del portiere (per avere la data dell'allenamento)
      const { data: allenRows } = await supabase.from('allenamenti')
        .select('id, data').eq('stagione_id', stagione?.id ?? 'none')
      const dataByAllenamento = {}
      for (const a of allenRows ?? []) dataByAllenamento[a.id] = a.data

      const { data: valRows } = await supabase.from('valutazioni')
        .select('id, allenamento_id').eq('portiere_id', id)
      const allenamentoByValutazione = {}
      for (const v of valRows ?? []) allenamentoByValutazione[v.id] = v.allenamento_id
      const valutazioneIds = (valRows ?? []).map((v) => v.id)

      let punteggiRows = []
      if (valutazioneIds.length > 0) {
        const { data } = await supabase.from('valutazione_punteggi')
          .select('valutazione_id, parametro_id, punteggio')
          .in('valutazione_id', valutazioneIds)
          .in('parametro_id', parametroIdsCollegati)
        punteggiRows = data ?? []
      }

      const nomeParametro = {}
      for (const p of parametriTutti) nomeParametro[p.id] = p.nome

      // Costruisci serie temporale per parametro_id
      const seriePerParametro = {}
      for (const pp of punteggiRows) {
        const allenId = allenamentoByValutazione[pp.valutazione_id]
        const data = dataByAllenamento[allenId]
        if (!data) continue
        (seriePerParametro[pp.parametro_id] ??= []).push({ x: data, y: Number(pp.punteggio) })
      }
      for (const k of Object.keys(seriePerParametro)) {
        seriePerParametro[k].sort((a, b) => a.x.localeCompare(b.x))
      }

      // Assegna il trend a ogni obiettivo in base ai suoi parametri collegati
      for (const r of obParRows ?? []) {
        const nome = nomeParametro[r.parametro_id] ?? 'Parametro'
        const punti = seriePerParametro[r.parametro_id] ?? []
        ;(trendPerObiettivo[r.obiettivo_id] ??= {})[nome] = { punti }
      }
    }
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
          <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link">Statistiche</Link>
          <Link href={`/portieri/${id}/percorso`} className="sub-nav-link">Percorso</Link>
        </div>
        {canObiettivi ? <ObiettiviManager
          portiereId={id}
          stagioneId={stagione?.id ?? null}
          ruolo={profiloViewer?.ruolo ?? null}
          obiettivi={obiettivi ?? []}
          sottoByObiettivo={sottoByObiettivo}
          parametriTutti={parametriTutti}
          eserciziTutti={eserciziTutti}
          collegamentiPerObiettivo={collegamentiPerObiettivo}
          trendPerObiettivo={trendPerObiettivo}
          proposte={proposte ?? []}
        /> : <PaywallBanner chiave="obiettivi_portieri" label="Obiettivi portieri" />}
      </div>
    </>
  )
}
