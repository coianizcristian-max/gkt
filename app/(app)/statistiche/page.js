import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatisticheClient from './StatisticheClient'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function StatistichePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, permessi_collaboratore').eq('id', user?.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'
  if (profilo?.ruolo === 'staff' && !puoVisualizzare({ ruolo: profilo.ruolo, permessiCollaboratore: profilo.permessi_collaboratore }, 'statistiche')) {
    redirect('/dashboard')
  }

  const { stagione } = await getStagioneAttiva(supabase, user?.id)

  if (!stagione) {
    return (
      <>
        <div className="topbar"><div className="eyebrow">Statistiche</div><h1>Statistiche</h1></div>
        <div className="content"><div className="empty">Nessuna stagione attiva.</div></div>
      </>
    )
  }

  const [{ data: iscr }, { data: cats }, { data: allen }, { data: part }] = await Promise.all([
    supabase.from('iscrizioni')
      .select('portiere_id, squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url)')
      .eq('stagione_id', stagione.id),
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    supabase.from('allenamenti').select('id, squadra_id').eq('stagione_id', stagione.id),
    supabase.from('partite').select('id, squadra_id, gol_subiti, tipo').eq('stagione_id', stagione.id),
  ])

  const allenIds = (allen ?? []).map((a) => a.id)
  const partIds = (part ?? []).map((p) => p.id)

  const [{ data: vAll }, { data: vPar }, { data: feedbackRows }] = await Promise.all([
    allenIds.length
      ? supabase.from('valutazioni').select('portiere_id, presente, voto, allenamento_id').in('allenamento_id', allenIds)
      : Promise.resolve({ data: [] }),
    partIds.length
      ? supabase.from('valutazioni_partita').select('portiere_id, presente, voto, punti, partita_id').in('partita_id', partIds)
      : Promise.resolve({ data: [] }),
    allenIds.length
      ? supabase.from('valutazioni')
        .select('portiere_id, feedback_portiere, voto_portiere, allenamento_id, portieri(nome, cognome), allenamenti(data, squadra:squadre!allenamenti_squadra_id_fkey(nome))')
        .in('allenamento_id', allenIds)
        .not('feedback_portiere', 'is', null)
        .order('allenamento_id')
      : Promise.resolve({ data: [] }),
  ])

  const catNome = {}
  for (const r of cats ?? []) if (r.squadre) catNome[r.squadre.id] = r.squadre.nome
  const totAllenByCat = {}
  for (const a of allen ?? []) totAllenByCat[a.squadra_id] = (totAllenByCat[a.squadra_id] ?? 0) + 1
  const golSubitiByPartita = {}
  const tipoPartita = {}
  for (const p of part ?? []) { golSubitiByPartita[p.id] = p.gol_subiti; tipoPartita[p.id] = p.tipo }

  const vAllBy = {}
  for (const v of vAll ?? []) (vAllBy[v.portiere_id] ??= []).push(v)
  const vParBy = {}
  for (const v of vPar ?? []) (vParBy[v.portiere_id] ??= []).push(v)

  const portieri = (iscr ?? [])
    .map((r) => (r.portieri ? { ...r.portieri, squadra_id: r.squadra_id, numero_maglia: r.numero_maglia } : null))
    .filter(Boolean)
    .sort((a, b) => (catNome[a.squadra_id] || '').localeCompare(catNome[b.squadra_id] || '') || `${a.nome}`.localeCompare(`${b.nome}`))

  const stats = portieri.map((p) => {
    const va = vAllBy[p.id] ?? []
    const presenze = va.filter((x) => x.presente).length
    const votiA = va.filter((x) => x.voto != null).map((x) => Number(x.voto))
    const mediaA = votiA.length ? votiA.reduce((s, x) => s + x, 0) / votiA.length : null
    const vp = vParBy[p.id] ?? []
    // Media partite solo campionato (esclude amichevoli)
    const vpCamp = vp.filter((x) => x.presente && tipoPartita[x.partita_id] !== 'amichevole')
    const votiP = vpCamp.filter((x) => x.voto != null).map((x) => Number(x.voto))
    const mediaP = votiP.length ? votiP.reduce((s, x) => s + x, 0) / votiP.length : null
    const cleanSheet = vpCamp.filter((x) => golSubitiByPartita[x.partita_id] === 0).length
    const punti = vp.reduce((s, x) => s + (x.punti != null ? Number(x.punti) : 0), 0)
    const nPartite = vpCamp.length
    return { p, totAllen: totAllenByCat[p.squadra_id] ?? 0, presenze, mediaA, mediaP, nPartite, cleanSheet, punti }
  })

  // Statistiche feedback (P14)
  const feedbackStats = {
    totFeedback: (feedbackRows ?? []).length,
    conVoto: (feedbackRows ?? []).filter((f) => f.voto_portiere != null).length,
    mediaVotoPortiere: (() => {
      const arr = (feedbackRows ?? []).filter((f) => f.voto_portiere != null).map((f) => Number(f.voto_portiere))
      return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null
    })(),
    // Allenamenti valutati = allenamenti con almeno una valutazione presente
    allenValutati: new Set((vAll ?? []).filter((v) => v.voto != null).map((v) => v.allenamento_id)).size,
    totAllenamenti: allenIds.length,
  }

  const categorieOrd = (cats ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const byCat = {}
  for (const st of stats) (byCat[st.p.squadra_id] ??= []).push(st)

  return (
    <>
      <div className="topbar topbar-row">
        <div><div className="eyebrow">Stagione {stagione.nome}</div><h1>Statistiche</h1></div>
      </div>
      <div className="content">
        <StatisticheClient
          stats={stats}
          categorieOrd={categorieOrd}
          byCat={byCat}
          feedbackStats={feedbackStats}
          feedback={feedbackRows ?? []}
          isPortiere={isPortiere}
          myPortiereId={profilo?.portiere_id ?? null}
        />
      </div>
    </>
  )
}
