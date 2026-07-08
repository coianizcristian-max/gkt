import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisionePartita({ params }) {
  const { id: preparatoreId, partitaId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = getAdmin()
  const { data: rel } = await admin.from('relazioni_supervisione').select('id')
    .eq('supervisore_id', user.id).eq('preparatore_id', preparatoreId).eq('attivo', true).maybeSingle()
  if (!rel) notFound()

  const basePath = `/responsabile/preparatore/${preparatoreId}`

  const { data: partita } = await admin
    .from('partite')
    .select('*, squadre(nome)')
    .eq('id', partitaId).maybeSingle()
  if (!partita) notFound()

  const { data: valRows } = await admin
    .from('valutazioni_partita')
    .select('portiere_id, presente, voto, note, portieri(id, nome, cognome, foto_url)')
    .eq('partita_id', partitaId)
    .order('voto', { ascending: false })

  const dataLabel = new Date(partita.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const presenti = (valRows ?? []).filter(v => v.presente)
  const assenti = (valRows ?? []).filter(v => !v.presente)

  let risultatoColore = 'var(--ink-soft)'
  if (partita.gol_fatti != null && partita.gol_subiti != null) {
    if (partita.gol_fatti > partita.gol_subiti) risultatoColore = 'var(--verde)'
    else if (partita.gol_fatti < partita.gol_subiti) risultatoColore = 'var(--rosso)'
    else risultatoColore = 'var(--giallo)'
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow"><Link href={`${basePath}/partite`}>← Partite</Link></div>
        <h1>
          {partita.casa ? '🏠' : '✈'} vs {partita.avversario}
          <span className="topbar-sub"> · {partita.squadre?.nome}</span>
        </h1>
      </div>
      <div className="content">

        {/* Info partita */}
        <div className="scheda" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'capitalize' }}>{dataLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {partita.gol_fatti != null && (
              <div style={{ fontWeight: 800, fontSize: 36, color: risultatoColore, letterSpacing: 2 }}>
                {partita.gol_fatti} – {partita.gol_subiti}
              </div>
            )}
            <div>
              {partita.tipo && <div style={{ fontSize: 13 }}>Tipo: {partita.tipo}</div>}
              {partita.gol_subiti === 0 && partita.gol_fatti != null && (
                <div style={{ fontSize: 13, color: 'var(--verde)', fontWeight: 600 }}>✓ Clean sheet</div>
              )}
            </div>
          </div>
          {partita.note && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{partita.note}</div>
          )}
        </div>

        {/* Valutazioni portieri */}
        {presenti.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Valutazioni portieri ({presenti.length})</h3>
            {presenti.map(v => (
              <div key={v.portiere_id} className="lista-riga" style={{ alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
                  background: 'var(--azzurro-chiaro)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {v.portieri?.foto_url && <Image src={v.portieri.foto_url} alt="" fill sizes="36px" style={{ objectFit: 'cover' }} />}
                  {!v.portieri?.foto_url && '🧤'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{v.portieri?.nome} {v.portieri?.cognome ?? ''}</div>
                  {v.note && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{v.note}</div>}
                </div>
                {v.voto != null && (
                  <span style={{ fontWeight: 700, fontSize: 16 }}>⭐ {v.voto}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assenti */}
        {assenti.length > 0 && (
          <div className="scheda">
            <h3 style={{ marginTop: 0 }}>Assenti ({assenti.length})</h3>
            {assenti.map(v => (
              <div key={v.portiere_id} className="lista-riga">
                <div style={{ fontWeight: 600, opacity: 0.6 }}>{v.portieri?.nome} {v.portieri?.cognome ?? ''}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}
