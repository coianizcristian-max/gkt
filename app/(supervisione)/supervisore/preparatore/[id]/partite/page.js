import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisionePartite({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  let partite = []
  if (stagione) {
    const { data: pa } = await admin
      .from('partite')
      .select('id, data, avversario, casa, gol_fatti, gol_subiti, tipo, squadra_id, squadre(nome)')
      .eq('stagione_id', stagione.id)
      .order('data', { ascending: false })
    partite = pa ?? []
  }

  function risultato(p) {
    if (p.gol_fatti == null || p.gol_subiti == null) return '—'
    const s = `${p.gol_fatti}–${p.gol_subiti}`
    if (p.gol_fatti > p.gol_subiti) return { label: s, colore: 'var(--verde)' }
    if (p.gol_fatti < p.gol_subiti) return { label: s, colore: 'var(--rosso)' }
    return { label: s, colore: 'var(--giallo)' }
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{stagione?.nome ?? '—'}</div>
        <h1>Partite</h1>
      </div>
      <div className="content">
        {!stagione && <div className="empty">Nessuna stagione attiva.</div>}
        {partite.length === 0 && stagione && <div className="empty">Nessuna partita registrata.</div>}
        <div className="scheda">
          {partite.map(p => {
            const ris = risultato(p)
            const d = new Date(p.data)
            return (
              <div key={p.id} className="lista-riga" style={{ alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.casa ? 'vs' : '@'} {p.avversario}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {p.squadre?.nome ? ` · ${p.squadre.nome}` : ''}
                    {p.tipo ? ` · ${p.tipo}` : ''}
                  </div>
                </div>
                {typeof ris === 'object'
                  ? <span style={{ fontWeight: 700, fontSize: 16, color: ris.colore }}>{ris.label}</span>
                  : <span style={{ color: 'var(--ink-soft)' }}>{ris}</span>
                }
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
