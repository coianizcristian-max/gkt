import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneEsercizi({ params }) {
  const { id: preparatoreId } = await params
  const t = await getTranslations('supervisionePrep')
  const admin = getAdmin()

  const { data: esercizi } = await admin
    .from('esercizi')
    .select('id, titolo, descrizione, tipologia, difficolta, durata_minuti, video_url, pubblico, created_at')
    .eq('allenatore_id', preparatoreId)
    .eq('archiviato', false)
    .order('created_at', { ascending: false })

  const lista = esercizi ?? []

  const gruppi = {}
  lista.forEach(e => {
    const k = e.tipologia ?? t('altro')
    if (!gruppi[k]) gruppi[k] = []
    gruppi[k].push(e)
  })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('libreria')}</div>
        <h1>{t('eserciziCount', { n: lista.length })}</h1>
      </div>
      <div className="content">
        {lista.length === 0 && <div className="empty">{t('nessunEsercizio')}</div>}
        {Object.entries(gruppi).map(([tipo, items]) => (
          <div key={tipo} className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{tipo} ({items.length})</h3>
            {items.map(e => (
              <div key={e.id} className="lista-riga" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{e.titolo}</div>
                  {e.descrizione && (
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{e.descrizione}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {e.difficolta && <span>{t('difficolta', { d: e.difficolta })}</span>}
                    {e.durata_minuti && <span>{t('minuti', { n: e.durata_minuti })}</span>}
                    {e.pubblico && <span style={{ color: 'var(--verde)' }}>{t('pubblico')}</span>}
                  </div>
                </div>
                {e.video_url && (
                  <a
                    href={e.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-mini"
                    style={{ flexShrink: 0, textDecoration: 'none' }}
                  >
                    {t('video')}
                  </a>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
