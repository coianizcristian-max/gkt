import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArchivioSelect from '@/app/components/ArchivioSelect'
import ExportButtons from '@/app/components/ExportButtons'

export const dynamic = 'force-dynamic'
const fmt = (n) => (n == null ? '\u2014' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 }))

export default async function ArchivioPage({ searchParams }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: stagioni } = await supabase.from('stagioni')
    .select('id, nome, attiva').order('data_inizio', { ascending: false, nullsFirst: false })

  if (!stagioni || stagioni.length === 0) {
    return (
      <>
        <div className="topbar"><div className="eyebrow">Archivio</div><h1>Archivio stagioni</h1></div>
        <div className="content"><div className="empty">Nessuna stagione presente.</div></div>
      </>
    )
  }

  const selectedId = sp?.stagione || (stagioni.find((s) => s.attiva)?.id ?? stagioni[0].id)
  const stagione = stagioni.find((s) => s.id === selectedId) ?? stagioni[0]

  const [{ data: iscr }, { data: cats }, { data: allen }, { data: part }] = await Promise.all([
    supabase.from('iscrizioni').select('portiere_id, squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url)').eq('stagione_id', stagione.id),
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    supabase.from('allenamenti').select('id, squadra_id').eq('stagione_id', stagione.id),
    supabase.from('partite').select('id, data, squadra_id, avversario, casa, gol_fatti, gol_subiti, squadre(nome)').eq('stagione_id', stagione.id).order('data', { ascending: false }),
  ])

  const allenIds = (allen ?? []).map((a) => a.id)
  const partIds = (part ?? []).map((p) => p.id)
  const [{ data: vAll }, { data: vPar }] = await Promise.all([
    allenIds.length ? supabase.from('valutazioni').select('portiere_id, presente, voto').in('allenamento_id', allenIds) : Promise.resolve({ data: [] }),
    partIds.length ? supabase.from('valutazioni_partita').select('portiere_id, presente, voto, punti, partita_id').in('partita_id', partIds) : Promise.resolve({ data: [] }),
  ])

  const catNome = {}
  for (const r of cats ?? []) if (r.squadre) catNome[r.squadre.id] = r.squadre.nome
  const totAllenByCat = {}
  for (const a of allen ?? []) totAllenByCat[a.squadra_id] = (totAllenByCat[a.squadra_id] ?? 0) + 1
  const golSubitiByPartita = {}
  for (const p of part ?? []) golSubitiByPartita[p.id] = p.gol_subiti
  const vAllBy = {}; for (const v of vAll ?? []) (vAllBy[v.portiere_id] ??= []).push(v)
  const vParBy = {}; for (const v of vPar ?? []) (vParBy[v.portiere_id] ??= []).push(v)

  const portieri = (iscr ?? [])
    .map((r) => (r.portieri ? { ...r.portieri, squadra_id: r.squadra_id, numero_maglia: r.numero_maglia } : null))
    .filter(Boolean)
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
  const categorieOrd = (cats ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const byCat = {}; for (const st of stats) (byCat[st.p.squadra_id] ??= []).push(st)
  const esitoLabel = { V: 'Vinta', P: 'Persa', X: 'Pareggio' }

  return (
    <>
      <div className="topbar topbar-row">
        <div><div className="eyebrow">Sola lettura</div><h1>Archivio stagioni</h1></div>
      </div>
      <div className="content">
        <ArchivioSelect stagioni={stagioni} selectedId={stagione.id} />
        <ExportButtons stagioneId={stagione.id} />
        {!stagione.attiva && <p className="sub-intro">Stai consultando una stagione archiviata: i dati sono di sola lettura.</p>}

        <h2 className="sezione-titolo">Statistiche</h2>
        {stats.length === 0 ? <div className="empty">Nessun portiere in questa stagione.</div> : (
          categorieOrd.map((cat) => {
            const lista = byCat[cat.id] ?? []
            if (lista.length === 0) return null
            return (
              <section key={cat.id}>
                <div className="squadra-head"><h2>{cat.nome}</h2><span className="conta">{lista.length} portieri</span></div>
                <div className="stat-grid">
                  {lista.map((s) => (
                    <div className="stat-card" key={s.p.id}>
                      <div className="stat-head">
                        <div className="stat-foto">{s.p.foto_url ? <img src={s.p.foto_url} alt="" /> : <span>{(s.p.nome || '?').charAt(0)}</span>}</div>
                        <div>
                          <div className="stat-nome">{s.p.nome} {s.p.cognome ?? ''}</div>
                          {s.p.numero_maglia ? <div className="stat-cat">#{s.p.numero_maglia}</div> : null}
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
              </section>
            )
          })
        )}

        <h2 className="sezione-titolo">Partite</h2>
        {(part ?? []).length === 0 ? <div className="empty">Nessuna partita.</div> : (
          <div className="partite-list">
            {(part ?? []).map((p) => {
              const cs = p.gol_subiti === 0
              const haRis = p.gol_fatti != null && p.gol_subiti != null
              const esito = !haRis ? null : (p.gol_fatti > p.gol_subiti ? 'V' : p.gol_fatti < p.gol_subiti ? 'P' : 'X')
              return (
                <div className="partita-row" key={p.id} style={{ cursor: 'default' }}>
                  <span className="pr-data">{new Date(p.data + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                  <span className="pr-cat">{p.squadre?.nome ?? ''}</span>
                  <span className="pr-match">{p.casa ? 'Casa' : 'Trasferta'} &middot; vs {p.avversario || '\u2014'}</span>
                  <span className="pr-score">{p.gol_fatti ?? '\u2013'}&ndash;{p.gol_subiti ?? '\u2013'}</span>
                  <span className="pr-esito-cell">{esito && <span className={`pr-esito esito-${esito}`}>{esitoLabel[esito]}</span>}</span>
                  <span className="pr-cs-cell">{cs && <span className="badge-cs">Clean sheet</span>}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
