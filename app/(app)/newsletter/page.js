import { createClient } from '@/lib/supabase/server'
import { NewsletterRender } from '@/app/components/NewsletterManager'

export const dynamic = 'force-dynamic'

export default async function NewsletterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invii } = await supabase.from('newsletter_invii')
    .select('id, titolo, contenuto, inviata_il, pubblicata')
    .eq('pubblicata', true).order('inviata_il', { ascending: false })

  if (user) {
    await supabase.from('profili').update({ newsletter_vista_il: new Date().toISOString() }).eq('id', user.id)
  }

  const ultima = invii?.[0]
  const archivio = invii?.slice(1) ?? []
  const societa = 'GKSeason'

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{societa}</div>
        <h1>Newsletter</h1>
      </div>
      <div className="content">
        {!ultima ? (
          <div className="empty">Nessuna newsletter pubblicata.</div>
        ) : (
          <>
            <NewsletterRender
              titolo={ultima.titolo}
              sezioni={ultima.contenuto}
              dataStr={new Date(ultima.inviata_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              societa={societa}
            />

            {archivio.length > 0 && (
              <div className="elenco-blocco" style={{ marginTop: 28, maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
                <h3>Newsletter precedenti</h3>
                {archivio.map((n) => (
                  <div key={n.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600 }}>
                      Newsletter del {new Date(n.inviata_il).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <small style={{ color: 'var(--ink-soft)' }}>{n.titolo}</small>
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
