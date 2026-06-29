import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function SupervisorePreparatorePage({ params }) {
  const { id: preparatoreId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica che il richiedente sia un allenatore
  const { data: profiloMio } = await supabase
    .from('profili')
    .select('ruolo')
    .eq('id', user.id)
    .maybeSingle()
  if (profiloMio?.ruolo !== 'allenatore') redirect('/')

  const admin = getAdmin()

  // Verifica che esista la relazione attiva supervisore → preparatore
  const { data: relazione } = await admin
    .from('relazioni_supervisione')
    .select('id, attivo, created_at')
    .eq('supervisore_id', user.id)
    .eq('preparatore_id', preparatoreId)
    .eq('attivo', true)
    .maybeSingle()

  if (!relazione) notFound()

  // Leggi profilo del preparatore
  const { data: profiloPre } = await admin
    .from('profili')
    .select('id, nome_completo, foto_url, citta, bio')
    .eq('id', preparatoreId)
    .maybeSingle()

  // Leggi le stagioni del preparatore
  const { data: stagioni } = await admin
    .from('stagioni')
    .select('id, nome, stagione_corrente, created_at')
    .eq('owner_id', preparatoreId)
    .order('created_at', { ascending: false })

  // Per la stagione corrente: portieri e ultimi allenamenti
  const stagioneAttiva = stagioni?.find(s => s.stagione_corrente) ?? stagioni?.[0] ?? null

  let portieri = []
  let ultimiAllenamenti = []

  if (stagioneAttiva) {
    const [{ data: isc }, { data: all }] = await Promise.all([
      admin
        .from('iscrizioni')
        .select('portieri(id, nome, cognome, foto_url)')
        .eq('stagione_id', stagioneAttiva.id),
      admin
        .from('allenamenti')
        .select('id, data, note')
        .eq('stagione_id', stagioneAttiva.id)
        .order('data', { ascending: false })
        .limit(5),
    ])
    portieri = (isc ?? []).map(r => r.portieri).filter(Boolean)
    ultimiAllenamenti = all ?? []
  }

  const nomePre = profiloPre?.nome_completo ?? '(nessun nome)'

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">
          <Link href="/i-miei-preparatori" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
            ← I miei preparatori
          </Link>
        </div>
        <h1>{nomePre}</h1>
      </div>

      <div className="content">

        {/* Banner supervisione */}
        <div style={{
          background: 'rgba(10,126,194,0.06)',
          border: '1px solid var(--azzurro)',
          borderRadius: 'var(--r)',
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--azzurro)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          👁 Stai visualizzando l&apos;area di <strong>{nomePre}</strong> in modalità supervisione (sola lettura).
        </div>

        {/* Profilo preparatore */}
        <div className="scheda" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'var(--azzurro-chiaro)',
            backgroundImage: profiloPre?.foto_url ? `url(${profiloPre.foto_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {!profiloPre?.foto_url && '👤'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{nomePre}</div>
            {profiloPre?.citta && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>📍 {profiloPre.citta}</div>}
            {profiloPre?.bio && <div style={{ fontSize: 13, marginTop: 6 }}>{profiloPre.bio}</div>}
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 6 }}>
              Collegato il {new Date(relazione.created_at).toLocaleDateString('it-IT')}
            </div>
          </div>
        </div>

        {/* Stagioni */}
        <div className="scheda" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Stagioni ({stagioni?.length ?? 0})</h3>
          {!stagioni || stagioni.length === 0
            ? <p className="sub-intro">Nessuna stagione creata.</p>
            : stagioni.map(s => (
                <div key={s.id} className="lista-riga" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{s.nome}</span>
                    {s.stagione_corrente && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, background: 'var(--verde)',
                        color: '#fff', borderRadius: 4, padding: '2px 6px',
                      }}>attiva</span>
                    )}
                  </div>
                </div>
              ))
          }
        </div>

        {/* Portieri stagione attiva */}
        {stagioneAttiva && (
          <div className="scheda" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>
              Portieri — {stagioneAttiva.nome} ({portieri.length})
            </h3>
            {portieri.length === 0
              ? <p className="sub-intro">Nessun portiere iscritto.</p>
              : portieri.map(p => (
                  <div key={p.id} className="lista-riga" style={{ alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--azzurro-chiaro)',
                      backgroundImage: p.foto_url ? `url(${p.foto_url})` : 'none',
                      backgroundSize: 'cover',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!p.foto_url && '🧤'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{p.nome} {p.cognome ?? ''}</div>
                  </div>
                ))
            }
          </div>
        )}

        {/* Ultimi allenamenti */}
        {stagioneAttiva && (
          <div className="scheda" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Ultimi allenamenti</h3>
            {ultimiAllenamenti.length === 0
              ? <p className="sub-intro">Nessun allenamento registrato.</p>
              : ultimiAllenamenti.map(a => (
                  <div key={a.id} className="lista-riga" style={{ alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(a.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </span>
                      {a.note && <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>{a.note}</span>}
                    </div>
                  </div>
                ))
            }
          </div>
        )}

      </div>
    </>
  )
}
