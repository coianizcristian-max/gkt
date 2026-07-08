import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function SupervisionePanoramica({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()
  const base = `/responsabile/preparatore/${preparatoreId}`

  const { data: profilo } = await admin
    .from('profili').select('nome_completo, foto_url, citta, bio').eq('id', preparatoreId).maybeSingle()

  const { data: stagioni } = await admin
    .from('stagioni').select('id, nome, attiva, created_at')
    .eq('owner_id', preparatoreId).order('created_at', { ascending: false })

  const stagioneAttiva = stagioni?.find(s => s.attiva) ?? stagioni?.[0] ?? null

  let portieri = [], ultimiAllenamenti = [], ultimaPartita = null
  if (stagioneAttiva) {
    const [{ data: isc }, { data: all }, { data: par }] = await Promise.all([
      admin.from('iscrizioni').select('portieri(id, nome, cognome, foto_url)').eq('stagione_id', stagioneAttiva.id),
      admin.from('allenamenti').select('id, data, note, squadra:squadre!allenamenti_squadra_id_fkey(nome)').eq('stagione_id', stagioneAttiva.id).order('data', { ascending: false }).limit(5),
      admin.from('partite').select('id, data, avversario, gol_fatti, gol_subiti, casa').eq('stagione_id', stagioneAttiva.id).order('data', { ascending: false }).limit(1),
    ])
    portieri = (isc ?? []).map(r => r.portieri).filter(Boolean)
    ultimiAllenamenti = all ?? []
    ultimaPartita = par?.[0] ?? null
  }

  const sezioni = [
    { href: `${base}/portieri`, label: 'Portieri', emoji: '🧤', count: portieri.length },
    { href: `${base}/calendario`, label: 'Calendario', emoji: '📅', count: ultimiAllenamenti.length > 0 ? `${ultimiAllenamenti.length} rec.` : '—' },
    { href: `${base}/partite`, label: 'Partite', emoji: '⚽', count: ultimaPartita ? `Ultima: ${ultimaPartita.avversario}` : '—' },
    { href: `${base}/statistiche`, label: 'Statistiche', emoji: '📊', count: '' },
    { href: `${base}/esercizi`, label: 'Esercizi', emoji: '📋', count: '' },
  ]

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Supervisione</div>
        <h1>{profilo?.nome_completo ?? 'Preparatore'}</h1>
      </div>
      <div className="content">

        {/* Info profilo */}
        <div className="scheda" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
            background: 'var(--azzurro-chiaro)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {profilo?.foto_url && <Image src={profilo.foto_url} alt="" fill sizes="56px" style={{ objectFit: 'cover' }} />}
            {!profilo?.foto_url && '👤'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{profilo?.nome_completo ?? '—'}</div>
            {profilo?.citta && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>📍 {profilo.citta}</div>}
            {profilo?.bio && <div style={{ fontSize: 13, marginTop: 4 }}>{profilo.bio}</div>}
            {stagioneAttiva && <div style={{ fontSize: 12, color: 'var(--verde)', marginTop: 4 }}>📅 Stagione attiva: {stagioneAttiva.nome}</div>}
          </div>
        </div>

        {/* Accesso rapido sezioni */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          {sezioni.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="scheda" style={{ textAlign: 'center', padding: '14px 10px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                {s.count !== '' && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{s.count}</div>}
              </div>
            </Link>
          ))}
        </div>

        {/* Ultimi allenamenti */}
        {ultimiAllenamenti.length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0 }}>Ultimi allenamenti</h3>
            {ultimiAllenamenti.map(a => (
              <Link key={a.id} href={`${base}/calendario/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="lista-riga" style={{ cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(a.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </span>
                    {a.squadra?.nome && (
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>{a.squadra.nome}</span>
                    )}
                    {a.note && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{a.note}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--azzurro)' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
