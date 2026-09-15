import { Link } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'
import { getTranslations } from 'next-intl/server'
import AndamentoMensile from '@/app/components/AndamentoMensile'
import ReportStagione from '@/app/components/ReportStagione'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'

export const dynamic = 'force-dynamic'

const MESI_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export default async function AndamentoPortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations('andamento')
  const tp = await getTranslations('portieri')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  const { data: portiere } = await supabase.from('portieri')
    .select('id, nome, cognome').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { stagione } = await getStagioneAttiva(supabase, user?.id)
  const { data: iscrizione } = stagione
    ? await supabase.from('iscrizioni').select('squadra_id, squadre(nome)')
        .eq('stagione_id', stagione.id).eq('portiere_id', id).maybeSingle()
    : { data: null }

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canReport = isUnlocked('report_pdf_stagione', gatingCfg, abbAttivo)

  const { data: commentoRow } = stagione
    ? await supabase.from('report_commenti')
        .select('commento_allenatore, commento_portiere')
        .eq('portiere_id', id).eq('stagione_id', stagione.id).maybeSingle()
    : { data: null }

  const oggi = new Date().toISOString().slice(0, 10)
  let mesi = []
  let parametri = []

  if (stagione && iscrizione) {
    const [{ data: allen }, { data: part }] = await Promise.all([
      supabase.from('allenamenti').select('id, data')
        .eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id).lte('data', oggi),
      supabase.from('partite').select('id, data')
        .eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id).lte('data', oggi),
    ])

    const allenIds = (allen ?? []).map((a) => a.id)
    const partIds = (part ?? []).map((p) => p.id)

    const [{ data: val }, { data: valPar }] = await Promise.all([
      allenIds.length
        ? supabase.from('valutazioni').select('id, allenamento_id, presente, voto, voto_portiere')
            .eq('portiere_id', id).in('allenamento_id', allenIds)
        : { data: [] },
      partIds.length
        ? supabase.from('valutazioni_partita').select('partita_id, presente, voto, gol_subiti, punti')
            .eq('portiere_id', id).in('partita_id', partIds)
        : { data: [] },
    ])

    const valIds = (val ?? []).map((v) => v.id)
    const { data: punteggi } = valIds.length
      ? await supabase.from('valutazione_punteggi')
          .select('valutazione_id, parametro_id, punteggio, parametri_valutazione(id, nome, ordine)')
          .in('valutazione_id', valIds)
      : { data: [] }

    const mappaPar = new Map()
    ;(punteggi ?? []).forEach((r) => {
      const p = r.parametri_valutazione
      if (p && !mappaPar.has(p.id)) mappaPar.set(p.id, { id: p.id, nome: p.nome, ordine: p.ordine ?? 0 })
    })
    parametri = [...mappaPar.values()]
      .sort((a, b) => a.ordine - b.ordine)
      .map((p) => ({ ...p, rpe: /^rpe/i.test(p.nome) }))

    const dataAllen = new Map((allen ?? []).map((a) => [a.id, a.data]))
    const dataPart = new Map((part ?? []).map((p) => [p.id, p.data]))
    const valMese = new Map((val ?? []).map((v) => [v.id, (dataAllen.get(v.allenamento_id) ?? '').slice(0, 7)]))

    const bucket = new Map()
    const tocca = (k) => {
      if (!bucket.has(k)) bucket.set(k, {
        key: k, allTot: 0, allPres: 0, votoSum: 0, votoN: 0, stelleSum: 0, stelleN: 0,
        parGio: 0, parVotoSum: 0, parVotoN: 0, parGolSub: 0, parClean: 0, parPunti: 0, par: {},
      })
      return bucket.get(k)
    }

    ;(val ?? []).forEach((v) => {
      const k = (dataAllen.get(v.allenamento_id) ?? '').slice(0, 7)
      if (!k) return
      const b = tocca(k)
      b.allTot += 1
      if (v.presente) b.allPres += 1
      if (v.voto != null) { b.votoSum += Number(v.voto); b.votoN += 1 }
      if (v.voto_portiere != null) { b.stelleSum += Number(v.voto_portiere); b.stelleN += 1 }
    })

    ;(punteggi ?? []).forEach((r) => {
      const k = valMese.get(r.valutazione_id)
      if (!k || r.punteggio == null) return
      const b = tocca(k)
      const pid = r.parametro_id
      if (!b.par[pid]) b.par[pid] = { s: 0, n: 0 }
      b.par[pid].s += Number(r.punteggio)
      b.par[pid].n += 1
    })

    ;(valPar ?? []).forEach((v) => {
      const k = (dataPart.get(v.partita_id) ?? '').slice(0, 7)
      if (!k || !v.presente) return
      const b = tocca(k)
      b.parGio += 1
      if (v.voto != null) { b.parVotoSum += Number(v.voto); b.parVotoN += 1 }
      if (v.gol_subiti != null) { b.parGolSub += v.gol_subiti; if (v.gol_subiti === 0) b.parClean += 1 }
      if (v.punti != null) b.parPunti += Number(v.punti)
    })

    // Un mese conta solo se e' concluso: il mese in corso resta senza valori.
    const meseCorrente = oggi.slice(0, 7)
    const inizio = (stagione.data_inizio ?? oggi).slice(0, 7)
    const fine = [(stagione.data_fine ?? oggi).slice(0, 7), meseCorrente].sort()[0]
    const chiavi = []
    let [y, m] = inizio.split('-').map(Number)
    for (let i = 0; i < 24; i++) {
      const k = `${y}-${String(m).padStart(2, '0')}`
      chiavi.push(k)
      if (k === fine) break
      m += 1
      if (m > 12) { m = 1; y += 1 }
    }

    mesi = chiavi.map((k) => {
      const b = bucket.get(k) ?? {
        key: k, allTot: 0, allPres: 0, votoSum: 0, votoN: 0, stelleSum: 0, stelleN: 0,
        parGio: 0, parVotoSum: 0, parVotoN: 0, parGolSub: 0, parClean: 0, parPunti: 0, par: {},
      }
      const parziale = k >= meseCorrente
      const vuoto = {
        key: k, allTot: 0, allPres: 0, votoSum: 0, votoN: 0, stelleSum: 0, stelleN: 0,
        parGio: 0, parVotoSum: 0, parVotoN: 0, parGolSub: 0, parClean: 0, parPunti: 0, par: {},
      }
      return { ...(parziale ? vuoto : b), key: k, parziale, label: MESI_IT[Number(k.slice(5)) - 1] }
    })
  }

  const navLinks = (
    <div className="sub-nav">
      <Link href={`/portieri/${id}`} className="sub-nav-link">{tp('navScheda')}</Link>
      {!soloPortiere && <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">{tp('navObiettivi')}</Link>}
      <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link">{tp('navStatistiche')}</Link>
      <Link href={`/portieri/${id}/andamento`} className="sub-nav-link active">{tp('navAndamento')}</Link>
      {!soloPortiere && <Link href={`/portieri/${id}/percorso`} className="sub-nav-link">{tp('navPercorso')}</Link>}
    </div>
  )

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? tp('miaScheda') : <Link href="/portieri">{tp('titolo')}</Link>}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        {navLinks}
        {iscrizione?.squadre?.nome && <p className="sub-intro">{iscrizione.squadre.nome}</p>}
        {!stagione || !iscrizione
          ? <div className="empty">{t('nessunaIscrizione')}</div>
          : <AndamentoMensile mesi={mesi} parametri={parametri} portiereId={id} />}
        {stagione && (
          <ReportStagione
            portiereId={id}
            stagioneId={stagione.id}
            soloPortiere={soloPortiere}
            commentoIniziale={{ allenatore: commentoRow?.commento_allenatore, portiere: commentoRow?.commento_portiere }}
            canReport={canReport}
          />
        )}
      </div>
    </>
  )
}
