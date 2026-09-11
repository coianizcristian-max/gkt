import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTranslations, getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneCalendario({ params }) {
  const { id: preparatoreId } = await params
  const t = await getTranslations('supervisionePrep')
  const c = await getTranslations('common')
  const locale = await getLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const admin = getAdmin()

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  let allenamenti = [], mesi = []
  if (stagione) {
    const { data: all } = await admin
      .from('allenamenti')
      .select('id, data, note, squadra_id, nessuna_valutazione, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
      .eq('stagione_id', stagione.id)
      .order('data', { ascending: false })
    allenamenti = all ?? []

    const mesiMap = {}
    allenamenti.forEach(a => {
      const d = new Date(a.data)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(dl, { month: 'long', year: 'numeric' })
      if (!mesiMap[key]) mesiMap[key] = { key, label, allenamenti: [] }
      mesiMap[key].allenamenti.push(a)
    })
    mesi = Object.values(mesiMap).sort((a, b) => b.key.localeCompare(a.key))
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{stagione?.nome ?? '—'}</div>
        <h1>{t('calendario')}</h1>
      </div>
      <div className="content">
        {!stagione && <div className="empty">{c('nessunaStagione')}</div>}
        {mesi.length === 0 && stagione && <div className="empty">{t('nessunAllenamento')}</div>}
        {mesi.map(m => (
          <div key={m.key} className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{m.label}</h3>
            {m.allenamenti.map(a => {
              const d = new Date(a.data)
              const giornoLabel = d.toLocaleDateString(dl, { weekday: 'long', day: 'numeric', month: 'short' })
              return (
                <div key={a.id} className="lista-riga" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{giornoLabel}</span>
                    {a.squadra?.nome && (
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 8 }}>{a.squadra.nome}</span>
                    )}
                    {a.note && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{a.note}</div>
                    )}
                  </div>
                  {a.nessuna_valutazione && (
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('senzaVal')}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
