import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function RenderContenuto({ sezioni }) {
  return (sezioni ?? []).map((s, i) => (
    <div key={i} style={{ marginBottom: 20 }}>
      {s.tipo === 'foto' && s.foto_url && (
        <img src={s.foto_url} alt={s.testo ?? ''} style={{ width: '100%', borderRadius: 'var(--r)', marginBottom: s.testo ? 8 : 0, maxHeight: 320, objectFit: 'cover' }} />
      )}
      {s.testo && <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15, whiteSpace: 'pre-wrap' }}>{s.testo}</p>}
    </div>
  ))
}

export default async function NewsletterPage() {
  const supabase = await createClient()
  const { data: invii } = await supabase.from('newsletter_invii')
    .select('id, titolo, contenuto, inviata_il, pubblicata')
    .eq('pubblicata', true).order('inviata_il', { ascending: false })

  const ultima = invii?.[0]
  const archivio = invii?.slice(1) ?? []

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">GKT</div>
        <h1>Newsletter</h1>
      </div>
      <div className="content">
        {!ultima ? (
          <div className="empty">Nessuna newsletter pubblicata.</div>
        ) : (
          <>
            <div className="scheda" style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>
                {new Date(ultima.inviata_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>{ultima.titolo}</h2>
              <RenderContenuto sezioni={ultima.contenuto} />
            </div>

            {archivio.length > 0 && (
              <div className="elenco-blocco">
                <h3>Archivio newsletter</h3>
                {archivio.map((n) => (
                  <div key={n.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600 }}>{n.titolo}</div>
                    <small style={{ color: 'var(--ink-soft)' }}>
                      {new Date(n.inviata_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
