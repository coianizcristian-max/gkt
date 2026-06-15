import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PortieriPage() {
  const supabase = await createClient()

  const [{ data: squadre }, { data: portieri }, { data: valutazioni }] =
    await Promise.all([
      supabase.from('squadre').select('id, nome, ordine').order('ordine'),
      supabase.from('portieri').select('id, nome, squadra_id, attivo').order('nome'),
      supabase.from('valutazioni').select('portiere_id, presente, voto'),
    ])

  // Aggrega statistiche per portiere
  const stats = {}
  for (const v of valutazioni ?? []) {
    const s = (stats[v.portiere_id] ??= { tot: 0, presenze: 0, somma: 0, conta: 0 })
    s.tot += 1
    if (v.presente) s.presenze += 1
    if (v.presente && v.voto != null) { s.somma += Number(v.voto); s.conta += 1 }
  }
  const media = (id) => {
    const s = stats[id]
    return s && s.conta ? (s.somma / s.conta).toFixed(2) : '—'
  }
  const presenzePct = (id) => {
    const s = stats[id]
    return s && s.tot ? Math.round((s.presenze / s.tot) * 100) + '%' : '—'
  }

  const perSquadra = (sqId) =>
    (portieri ?? []).filter((p) => p.squadra_id === sqId && p.attivo)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagione 2025–26</div>
        <h1>Portieri</h1>
      </div>
      <div className="content">
        {(squadre ?? []).map((sq) => {
          const lista = perSquadra(sq.id)
          if (lista.length === 0) return null
          return (
            <section key={sq.id}>
              <div className="squadra-head">
                <h2>{sq.nome}</h2>
                <span className="conta">{lista.length} portieri</span>
              </div>
              <div className="grid">
                {lista.map((p) => (
                  <div className="card-portiere" key={p.id}>
                    <div className="nome">{p.nome}</div>
                    <div className="ruolo">{sq.nome}</div>
                    <div className="stat-row">
                      <div className="stat">
                        <div className="num voto">{media(p.id)}</div>
                        <div className="lab">Media voto</div>
                      </div>
                      <div className="stat">
                        <div className="num">{presenzePct(p.id)}</div>
                        <div className="lab">Presenze</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        {(portieri ?? []).filter((p) => p.attivo).length === 0 && (
          <div className="empty">Nessun portiere ancora inserito.</div>
        )}
      </div>
    </>
  )
}
