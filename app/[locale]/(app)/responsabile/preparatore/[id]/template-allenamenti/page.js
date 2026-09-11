import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneTemplate({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()
  const t = await getTranslations('supervisione')

  const { data: templates } = await admin
    .from('template_allenamento')
    .select('id, nome, descrizione, created_at, template_allenamento_esercizi(ordine, esercizi(titolo, durata_minuti, recupero_minuti))')
    .eq('owner_id', preparatoreId)
    .order('created_at', { ascending: false })

  const lista = (templates ?? []).map((t) => ({
    ...t,
    esercizi: (t.template_allenamento_esercizi ?? []).sort((a, b) => a.ordine - b.ordine),
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('navTemplate')}</div>
        <h1>{t('templateTitolo')} ({lista.length})</h1>
      </div>
      <div className="content">
        {lista.length === 0 && <div className="empty">{t('nessunTemplate')}</div>}
        {lista.map((t) => (
          <div key={t.id} className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{t.nome}</h3>
            {t.descrizione && <p className="sub-intro" style={{ marginTop: 0 }}>{t.descrizione}</p>}
            {t.esercizi.length === 0
              ? <p className="sub-intro">{t('nessunEsercizioTemplate')}</p>
              : (
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {t.esercizi.map((r, i) => (
                    <li key={i}>
                      {r.esercizi?.titolo ?? t('esercizioFallback')}
                      {(r.esercizi?.durata_minuti || r.esercizi?.recupero_minuti) && (
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 6 }}>
                          {r.esercizi?.durata_minuti ? t('durataMin', { n: r.esercizi.durata_minuti }) : ''}
                          {r.esercizi?.durata_minuti && r.esercizi?.recupero_minuti ? ' · ' : ''}
                          {r.esercizi?.recupero_minuti ? t('recuperoMin', { n: r.esercizi.recupero_minuti }) : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
          </div>
        ))}
      </div>
    </>
  )
}
