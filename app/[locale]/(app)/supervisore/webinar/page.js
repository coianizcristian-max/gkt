import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations, getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default async function WebinarPage() {
  const supabase = await createClient()
  const t = await getTranslations('webinarManager')
  const c = await getTranslations('common')
  const locale = await getLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const SENZA = t('senzaCodice')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: righe, error } = await supabase
    .from('iscrizioni_webinar')
    .select('nome, email, telefono, ruolo, data_selezionata, webinar_codice, webinar_titolo, created_at')
    .order('created_at', { ascending: true })

  const campagne = {}
  for (const r of righe ?? []) {
    const cod = r.webinar_codice || SENZA
    campagne[cod] ??= { codice: cod, titolo: r.webinar_titolo || null, tot: 0, ultimaAt: r.created_at, date: {} }
    campagne[cod].tot += 1
    campagne[cod].ultimaAt = r.created_at
    if (!campagne[cod].titolo && r.webinar_titolo) campagne[cod].titolo = r.webinar_titolo
    const d = r.data_selezionata || t('nessunaData')
    campagne[cod].date[d] ??= []
    campagne[cod].date[d].push(r)
  }
  const listaCampagne = Object.values(campagne).sort((a, b) => new Date(b.ultimaAt) - new Date(a.ultimaAt))

  const fmtData = (d) => d ? new Date(d).toLocaleString(dl, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—'

  const exportUrl = (codice, data) =>
    `/api/webinar-export?codice=${encodeURIComponent(codice)}` + (data ? `&data=${encodeURIComponent(data)}` : '')

  const th = { padding: '7px 6px', whiteSpace: 'nowrap' }
  const td = { padding: '7px 6px', borderBottom: '1px solid var(--linea, #e2e6e1)' }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />

        {error && <div className="err" style={{ marginBottom: 16 }}>{t('erroreCaricamento')}{error.message}</div>}

        {listaCampagne.length === 0 && !error && (
          <div className="scheda" style={{ color: 'var(--ink-soft, #6b7e8e)' }}>
            {t('nessunaIscrizione')}
          </div>
        )}

        {listaCampagne.map((camp) => (
          <div className="scheda" key={camp.codice} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{camp.titolo || t('webinarFallback')}</h3>
                <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', fontFamily: 'monospace' }}>{camp.codice}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blu, #0a7ec2)' }}>
                  {camp.tot} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft, #6b7e8e)' }}>{t('iscritti')}</span>
                </div>
                <a className="btn-ghost" href={exportUrl(camp.codice, null)} style={{ fontSize: 13, padding: '5px 12px' }}>
                  {t('excelTutte')}
                </a>
              </div>
            </div>

            {Object.entries(camp.date).map(([data, iscritti]) => (
              <div key={data} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {data} <span style={{ color: 'var(--ink-soft, #6b7e8e)', fontWeight: 600 }}>· {iscritti.length} {t('iscritti')}</span>
                  </div>
                  <a className="btn-ghost" href={exportUrl(camp.codice, data)} style={{ fontSize: 12, padding: '3px 10px' }}>
                    {t('excel')}
                  </a>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--ink-soft, #6b7e8e)', borderBottom: '1px solid var(--linea, #e2e6e1)' }}>
                        <th style={th}>{t('thPos')}</th>
                        <th style={th}>{t('thNome')}</th>
                        <th style={th}>{t('thEmail')}</th>
                        <th style={th}>{t('thTelefono')}</th>
                        <th style={th}>{t('thRuolo')}</th>
                        <th style={th}>{t('thIscrittoIl')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iscritti.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...td, color: 'var(--ink-soft, #6b7e8e)', fontWeight: 700 }}>{i + 1}</td>
                          <td style={td}>{r.nome}</td>
                          <td style={td}>{r.email}</td>
                          <td style={td}>{r.telefono || '—'}</td>
                          <td style={td}>{r.ruolo === 'portiere' ? t('ruoloPortiere') : r.ruolo === 'preparatore' ? t('ruoloPreparatore') : '—'}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtData(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
