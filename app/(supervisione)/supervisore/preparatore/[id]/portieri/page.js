import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisionePortieri({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  let iscrizioni = [], squadre = []
  if (stagione) {
    const [{ data: isc }, { data: sq }] = await Promise.all([
      admin.from('iscrizioni')
        .select('id, numero_maglia, attivo, squadra_id, portieri(id, nome, cognome, foto_url, data_nascita)')
        .eq('stagione_id', stagione.id),
      admin.from('stagione_categorie')
        .select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    ])
    iscrizioni = isc ?? []
    squadre = (sq ?? []).map(r => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{stagione?.nome ?? '—'}</div>
        <h1>Portieri</h1>
      </div>
      <div className="content">
        {!stagione && <div className="empty">Nessuna stagione attiva.</div>}
        {squadre.map(sq => {
          const isc = iscrizioni.filter(i => i.squadra_id === sq.id)
          if (isc.length === 0) return null
          return (
            <div key={sq.id} className="scheda" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>{sq.nome} ({isc.length})</h3>
              {isc.map(i => {
                const p = i.portieri
                if (!p) return null
                const eta = p.data_nascita
                  ? Math.floor((new Date() - new Date(p.data_nascita)) / (365.25 * 24 * 3600 * 1000))
                  : null
                return (
                  <div key={i.id} className={`lista-riga ${i.attivo ? '' : 'assente'}`} style={{ alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
                      background: 'var(--azzurro-chiaro)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {p.foto_url && <Image src={p.foto_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />}
                      {!p.foto_url && '🧤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{p.nome} {p.cognome ?? ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {i.numero_maglia ? `#${i.numero_maglia}` : ''}
                        {eta ? ` · ${eta} anni` : ''}
                        {!i.attivo ? ' · inattivo' : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
        {iscrizioni.length === 0 && stagione && <div className="empty">Nessun portiere iscritto.</div>}
      </div>
    </>
  )
}
