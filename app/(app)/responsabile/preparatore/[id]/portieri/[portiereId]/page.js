import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisionePortiere({ params }) {
  const { id: preparatoreId, portiereId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = getAdmin()
  const { data: rel } = await admin.from('relazioni_supervisione').select('id')
    .eq('supervisore_id', user.id).eq('preparatore_id', preparatoreId).eq('attivo', true).maybeSingle()
  if (!rel) notFound()

  const basePath = `/responsabile/preparatore/${preparatoreId}`

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  const { data: portiere } = await admin
    .from('portieri').select('*').eq('id', portiereId).maybeSingle()
  if (!portiere) notFound()

  const { data: iscr } = stagione ? await admin.from('iscrizioni')
    .select('squadra_id, numero_maglia, attivo, squadre(nome)')
    .eq('stagione_id', stagione.id).eq('portiere_id', portiereId).maybeSingle() : { data: null }

  // Ultime valutazioni
  let ultimiAllenamenti = []
  if (stagione) {
    const { data: allIds } = await admin.from('allenamenti').select('id').eq('stagione_id', stagione.id)
    const ids = (allIds ?? []).map(a => a.id)
    if (ids.length > 0) {
      const { data: vals } = await admin
        .from('valutazioni')
        .select('id, presente, voto, note, allenamento_id, allenamenti(data, squadra:squadre!allenamenti_squadra_id_fkey(nome))')
        .eq('portiere_id', portiereId)
        .in('allenamento_id', ids)
        .order('allenamento_id', { ascending: false })
        .limit(10)
      ultimiAllenamenti = vals ?? []
    }
  }

  const presenze = ultimiAllenamenti.filter(v => v.presente).length
  const voti = ultimiAllenamenti.filter(v => v.voto != null).map(v => v.voto)
  const mediaVoto = voti.length > 0 ? (voti.reduce((a, b) => a + b, 0) / voti.length).toFixed(1) : null

  const eta = portiere.data_nascita
    ? Math.floor((new Date() - new Date(portiere.data_nascita)) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href={`${basePath}/portieri`}>← Portieri</Link></div>
        <h1>{portiere.nome} {portiere.cognome ?? ''}</h1>
      </div>
      <div className="content">

        {/* Anagrafica */}
        <div className="scheda" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          {portiere.foto_url && (
            <Image src={portiere.foto_url} alt="" width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{portiere.nome} {portiere.cognome ?? ''}</div>
            {eta && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{eta} anni</div>}
            {portiere.piede_preferito && <div style={{ fontSize: 13 }}>Piede: {portiere.piede_preferito}</div>}
            {portiere.altezza_cm && <div style={{ fontSize: 13 }}>Altezza: {portiere.altezza_cm} cm</div>}
            {portiere.peso_kg && <div style={{ fontSize: 13 }}>Peso: {portiere.peso_kg} kg</div>}
            {iscr && <div style={{ fontSize: 13, marginTop: 4 }}>
              {iscr.squadre?.nome} {iscr.numero_maglia ? `· #${iscr.numero_maglia}` : ''}
              {!iscr.attivo ? ' · inattivo' : ''}
            </div>}
          </div>
        </div>

        {/* Stats */}
        {ultimiAllenamenti.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Presenze', val: presenze, emoji: '✅' },
              { label: 'Su ' + ultimiAllenamenti.length, val: ultimiAllenamenti.length - presenze + ' ass.', emoji: '📋' },
              { label: 'Media voto', val: mediaVoto ?? '—', emoji: '⭐' },
            ].map(k => (
              <div key={k.label} className="scheda" style={{ textAlign: 'center', padding: '10px 6px' }}>
                <div style={{ fontSize: 20 }}>{k.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{k.val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Ultime valutazioni */}
        {ultimiAllenamenti.length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0 }}>Ultime valutazioni</h3>
            {ultimiAllenamenti.map(v => {
              const d = v.allenamenti?.data
              const dateLabel = d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '—'
              return (
                <div key={v.id} className="lista-riga" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{dateLabel}</span>
                    {v.allenamenti?.squadra?.nome && (
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>{v.allenamenti.squadra.nome}</span>
                    )}
                    {!v.presente && <span style={{ fontSize: 12, color: 'var(--rosso)', marginLeft: 8 }}>Assente</span>}
                    {v.note && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{v.note}</div>}
                  </div>
                  {v.presente && v.voto != null && (
                    <span style={{ fontWeight: 700, fontSize: 15 }}>⭐ {v.voto}</span>
                  )}
                  <Link href={`${basePath}/calendario/${v.allenamento_id}`} className="btn-mini">Apri →</Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
