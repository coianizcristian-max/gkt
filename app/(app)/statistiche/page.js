import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const fmt = (n) => (n == null ? '\u2014' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 }))

export default async function StatistichePage() {
  const supabase = await createClient()
  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

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
    supabase.from('partite').select('id, squadra_id, gol_subiti').eq('stagione_id', stagione.id),
  ])

  const allenIds = (allen ?? []).map((a) => a.id)
  const partIds = (part ?? []).map((p) => p.id)
  const [{ data: vAll }, { data: vPar }] = await Promise.all([
    allenIds.length
      ? supabase.from('valutazioni').select('portiere_id, presente, voto').in('allenamento_id', allenIds)
      : Promise.resolve({ data: [] }),
    partIds.length
      ? supabase.from('valutazioni_partita').select('portiere_id, presente, voto, punti, partita_id').in('partita_id', partIds)
      : Promise.resolve({ data: [] }),
  ])

  const catNome = {}
  for (const r of cats ?? []) if (r.squadre) catNome[r.squadre.id] = r.squadre.nome
  const totAllenByCat = {}
  for (const a of allen ?? []) totAllenByCat[a.squadra_id] = (totAllenByCat[a.squadra_id] ?? 0) + 1
  const golSubitiByPartita = {}
  for (const p of part ?? []) golSubitiByPartita[p.id] = p.gol_subiti

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
    const vpPresent = vp.filter((x) => x.presente)
    const votiP = vpPresent.filter((x) => x.voto != null).map((x) => Number(x.voto))
    const mediaP = votiP.length ? votiP.reduce((s, x) => s + x, 0) / votiP.length : null
    const cleanSheet = vpPresent.filter((x) => golSubitiByPartita[x.partita_id] === 0).length
    const punti = vp.reduce((s, x) => s + (x.punti != null ? Number(x.punti) : 0), 0)
    return { p, totAllen: totAllenByCat[p.squadra_id] ?? 0, presenze, mediaA, mediaP, nPartite: vpPresent.length, cleanSheet, punti }
  })

  return (
    <>
      <div className="topbar topbar-row">
        <div><div className="eyebrow">Stagione {stagione.nome}</div><h1>Statistiche</h1></div>
      </div>
      <div className="content">
        {stats.length === 0 ? (
          <div className="empty">Nessun portiere iscritto alla stagione.</div>
        ) : (
          <div className="stat-grid">
            {stats.map((s) => (
              <div className="stat-card" key={s.p.id}>
                <div className="stat-head">
                  <div className="stat-foto">
                    {s.p.foto_url ? <img src={s.p.foto_url} alt="" /> : <span>{(s.p.nome || '?').charAt(0)}</span>}
                  </div>
                  <div>
                    <div className="stat-nome">{s.p.nome} {s.p.cognome ?? ''}</div>
                    <div className="stat-cat">{catNome[s.p.squadra_id] ?? ''}{s.p.numero_maglia ? ` \u00b7 #${s.p.numero_maglia}` : ''}</div>
                  </div>
                </div>
                <div className="stat-rows">
                  <div className="stat-block">
                    <h4>Allenamenti</h4>
                    <div className="stat-line"><span>Presenze</span><b>{s.presenze}/{s.totAllen}</b></div>
                    <div className="stat-line"><span>Media voto</span><b>{fmt(s.mediaA)}</b></div>
                  </div>
                  <div className="stat-block">
                    <h4>Partite</h4>
                    <div className="stat-line"><span>Giocate</span><b>{s.nPartite}</b></div>
                    <div className="stat-line"><span>Media voto</span><b>{fmt(s.mediaP)}</b></div>
                    <div className="stat-line"><span>Clean sheet</span><b>{s.cleanSheet}</b></div>
                    <div className="stat-line"><span>Punti</span><b>{fmt(s.punti)}</b></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
