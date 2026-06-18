import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const fmt = (n, dec = 2) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec }))

export default async function StatistichePortierePage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiloViewer } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  const soloPortiere = profiloViewer?.ruolo === 'portiere'
  // Un portiere può vedere solo se stesso
  if (soloPortiere && profiloViewer.portiere_id !== id) notFound()

  const { data: portiere } = await supabase.from('portieri').select('id, nome, cognome').eq('id', id).maybeSingle()
  if (!portiere) notFound()

  const { data: stagione } = await supabase.from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()
  const { data: iscrizione } = stagione
    ? await supabase.from('iscrizioni').select('squadra_id, squadre(nome)').eq('stagione_id', stagione.id).eq('portiere_id', id).maybeSingle()
    : { data: null }

  // Allenamenti + valutazioni portiere
  let vAll = [], vPar = [], punteggi = [], parametri = [], partite = []
  if (stagione) {
    const { data: allenamenti } = await supabase.from('allenamenti')
      .select('id, data').eq('stagione_id', stagione.id)
    const allenIds = (allenamenti ?? []).map((a) => a.id)
    const allenByDate = {}
    for (const a of allenamenti ?? []) allenByDate[a.id] = a.data

    const { data: partiteRows } = await supabase.from('partite')
      .select('id, data, tipo').eq('stagione_id', stagione.id)
    const partIds = (partiteRows ?? []).map((p) => p.id)
    partite = partiteRows ?? []
    const partitiByDate = {}
    for (const p of partiteRows ?? []) partitiByDate[p.id] = { data: p.data, tipo: p.tipo }

    const [va, vp, pp, par] = await Promise.all([
      allenIds.length
        ? supabase.from('valutazioni').select('allenamento_id, presente, voto').eq('portiere_id', id).in('allenamento_id', allenIds)
        : Promise.resolve({ data: [] }),
      partIds.length
        ? supabase.from('valutazioni_partita').select('partita_id, presente, voto, punti').eq('portiere_id', id).in('partita_id', partIds)
        : Promise.resolve({ data: [] }),
      supabase.from('valutazione_punteggi')
        .select('valutazione_id, parametro_id, punteggio')
        .in('valutazione_id',
          // Serves as placeholder — we'll do a second pass with real val ids below
          ['00000000-0000-0000-0000-000000000000']),
      supabase.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    ])
    vAll = (va.data ?? []).map((v) => ({ ...v, data: allenByDate[v.allenamento_id] }))
    vPar = (vp.data ?? []).map((v) => ({ ...v, ...partitiByDate[v.partita_id] }))
    parametri = par.data ?? []

    // Punteggi per parametro (valutazioni allenamento)
    const { data: vAllFull } = await supabase.from('valutazioni')
      .select('id, allenamento_id').eq('portiere_id', id)
      .in('allenamento_id', allenIds.length ? allenIds : ['none'])
    const valIds = (vAllFull ?? []).map((v) => v.id)
    if (valIds.length) {
      const { data: pp2 } = await supabase.from('valutazione_punteggi')
        .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', valIds)
      punteggi = pp2 ?? []
    }
  }

  // Calcoli allenamenti
  const presenzeA = vAll.filter((v) => v.presente).length
  const totA = vAll.length
  const votiA = vAll.filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
  const mediaA = votiA.length ? votiA.reduce((s, x) => s + x, 0) / votiA.length : null

  // Per mese (ultimi 6)
  const votiMese = {}
  for (const v of vAll) {
    if (!v.presente || v.voto == null || !v.data) continue
    const m = v.data.slice(0, 7)
    ;(votiMese[m] ??= []).push(Number(v.voto))
  }
  const mesi = Object.keys(votiMese).sort().slice(-6)

  // Calcoli partite: separa campionato da amichevoli
  const parCamp = vPar.filter((v) => v.tipo !== 'amichevole' && v.presente)
  const parAm = vPar.filter((v) => v.tipo === 'amichevole' && v.presente)
  const mediaPartite = (arr) => {
    const vv = arr.filter((v) => v.voto != null).map((v) => Number(v.voto))
    return vv.length ? vv.reduce((s, x) => s + x, 0) / vv.length : null
  }

  // Per caratteristica
  const perParametro = {}
  for (const pp of punteggi) {
    ;(perParametro[pp.parametro_id] ??= []).push(Number(pp.punteggio))
  }
  const mediaParam = (arr) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null

  // Media categoria per confronto (allenamenti)
  let mediaCat = null
  if (iscrizione?.squadra_id && stagione) {
    const { data: iscCat } = await supabase.from('iscrizioni')
      .select('portiere_id').eq('stagione_id', stagione.id).eq('squadra_id', iscrizione.squadra_id)
    const catIds = (iscCat ?? []).map((i) => i.portiere_id).filter((pid) => pid !== id)
    if (catIds.length) {
      const { data: vCat } = await supabase.from('valutazioni')
        .select('voto, presente').in('portiere_id', catIds)
      const votiCat = (vCat ?? []).filter((v) => v.presente && v.voto != null).map((v) => Number(v.voto))
      mediaCat = votiCat.length ? votiCat.reduce((s, x) => s + x, 0) / votiCat.length : null
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{soloPortiere ? 'La mia scheda' : <Link href="/portieri">Portieri</Link>} · Stagione {stagione?.nome ?? '—'}</div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">
        <div className="sub-nav">
          <Link href={`/portieri/${id}`} className="sub-nav-link">Scheda</Link>
          <Link href={`/portieri/${id}/obiettivi`} className="sub-nav-link">Obiettivi</Link>
          <Link href={`/portieri/${id}/statistiche`} className="sub-nav-link active">Statistiche</Link>
        </div>

        {/* Riepilogo allenamenti */}
        <div className="scheda">
          <h3 style={{ marginTop: 0 }}>Allenamenti — stagione {stagione?.nome ?? '—'}</h3>
          <div className="stat-rows">
            <div className="stat-block">
              <div className="stat-line"><span>Presenze</span><b>{presenzeA}/{totA}</b></div>
              <div className="stat-line"><span>% presenza</span><b>{totA ? Math.round(presenzeA / totA * 100) + '%' : '—'}</b></div>
              <div className="stat-line"><span>Media voto allenatore</span><b>{fmt(mediaA)}</b></div>
              {mediaCat != null && (
                <div className="stat-line">
                  <span>Media categoria</span>
                  <b style={{ color: mediaA != null && mediaA >= mediaCat ? 'var(--campo)' : 'var(--rosso)' }}>
                    {fmt(mediaCat)} {mediaA != null ? (mediaA >= mediaCat ? '▲' : '▼') : ''}
                  </b>
                </div>
              )}
            </div>
            <div className="stat-block">
              <h4 style={{ margin: '0 0 6px' }}>Partite</h4>
              <div className="stat-line"><span>Campionato</span><b>{parCamp.length} giocate · media {fmt(mediaPartite(parCamp))}</b></div>
              <div className="stat-line"><span>Amichevoli</span><b>{parAm.length} giocate · media {fmt(mediaPartite(parAm))}</b></div>
            </div>
          </div>
        </div>

        {/* Andamento mensile */}
        {mesi.length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0 }}>Andamento voti per mese</h3>
            <div className="stat-mesi">
              {mesi.map((m) => {
                const arr = votiMese[m]
                const med = arr.reduce((s, x) => s + x, 0) / arr.length
                return (
                  <div key={m} className="stat-mese-col">
                    <div className="stat-mese-bar-wrap">
                      <div className="stat-mese-bar" style={{ height: `${Math.round((med / 10) * 80)}px` }} />
                    </div>
                    <div className="stat-mese-val">{fmt(med, 1)}</div>
                    <div className="stat-mese-label">{m.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per caratteristica */}
        {parametri.length > 0 && Object.keys(perParametro).length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0 }}>Media per caratteristica</h3>
            {parametri.map((par) => {
              const arr = perParametro[par.id] ?? []
              if (!arr.length) return null
              const med = mediaParam(arr)
              return (
                <div key={par.id} className="stat-line" style={{ marginBottom: 6 }}>
                  <span>{par.nome}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: 'var(--linea)', borderRadius: 3 }}>
                      <div style={{ width: `${Math.round((med / 10) * 100)}%`, height: '100%', background: 'var(--azzurro)', borderRadius: 3 }} />
                    </div>
                    <b>{fmt(med, 1)}</b>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
