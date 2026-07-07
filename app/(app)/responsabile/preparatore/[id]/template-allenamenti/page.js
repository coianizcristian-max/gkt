import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneTemplate({ params }) {
  const { id: preparatoreId } = await params
  const admin = getAdmin()

  const { data: templates } = await admin
    .from('template_allenamento')
    .select('id, nome, descrizione, created_at, template_allenamento_esercizi(ordine, esercizi(titolo))')
    .eq('owner_id', preparatoreId)
    .order('created_at', { ascending: false })

  const lista = (templates ?? []).map((t) => ({
    ...t,
    esercizi: (t.template_allenamento_esercizi ?? []).sort((a, b) => a.ordine - b.ordine),
  }))

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Template</div>
        <h1>Template allenamenti ({lista.length})</h1>
      </div>
      <div className="content">
        {lista.length === 0 && <div className="empty">Nessun template creato.</div>}
        {lista.map((t) => (
          <div key={t.id} className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{t.nome}</h3>
            {t.descrizione && <p className="sub-intro" style={{ marginTop: 0 }}>{t.descrizione}</p>}
            {t.esercizi.length === 0
              ? <p className="sub-intro">Nessun esercizio in questo template.</p>
              : (
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {t.esercizi.map((r, i) => <li key={i}>{r.esercizi?.titolo ?? 'Esercizio'}</li>)}
                </ol>
              )}
          </div>
        ))}
      </div>
    </>
  )
}
