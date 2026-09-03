import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'

export const dynamic = 'force-dynamic'

const SENZA = '(senza codice)'

export default async function WebinarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // ordine di ISCRIZIONE (ascendente): la prima riga è il primo iscritto.
  const { data: righe, error } = await supabase
    .from('iscrizioni_webinar')
    .select('nome, email, telefono, data_selezionata, webinar_codice, webinar_titolo, created_at')
    .order('created_at', { ascending: true })

  // raggruppa per campagna → per data (mantiene l'ordine d'arrivo dentro ogni data)
  const campagne = {}
  for (const r of righe ?? []) {
    const cod = r.webinar_codice || SENZA
    campagne[cod] ??= { codice: cod, titolo: r.webinar_titolo || null, tot: 0, ultimaAt: r.created_at, date: {} }
    campagne[cod].tot += 1
    campagne[cod].ultimaAt = r.created_at // ascendente → l'ultima vista è la più recente
    if (!campagne[cod].titolo && r.webinar_titolo) campagne[cod].titolo = r.webinar_titolo
    const d = r.data_selezionata || '(nessuna data)'
    campagne[cod].date[d] ??= []
    campagne[cod].date[d].push(r)
  }
  // campagne più recenti in alto
  const listaCampagne = Object.values(campagne).sort((a, b) => new Date(b.ultimaAt) - new Date(a.ultimaAt))

  const fmtData = (d) => d ? new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—'

  const exportUrl = (codice, data) =>
    `/api/webinar-export?codice=${encodeURIComponent(codice)}` + (data ? `&data=${encodeURIComponent(data)}` : '')

  const th = { padding: '7px 6px', whiteSpace: 'nowrap' }
  const td = { padding: '7px 6px', borderBottom: '1px solid var(--linea, #e2e6e1)' }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Webinar</h1>
      </div>
      <div className="content">
        <SupervisoreNav />

        {error && <div className="err" style={{ marginBottom: 16 }}>Errore nel caricamento: {error.message}</div>}

        {listaCampagne.length === 0 && !error && (
          <div className="scheda" style={{ color: 'var(--ink-soft, #6b7e8e)' }}>
            Nessuna iscrizione al webinar per ora.
          </div>
        )}

        {listaCampagne.map((c) => (
          <div className="scheda" key={c.codice} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{c.titolo || 'Webinar'}</h3>
                <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', fontFamily: 'monospace' }}>{c.codice}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blu, #0a7ec2)' }}>
                  {c.tot} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft, #6b7e8e)' }}>iscritti</span>
                </div>
                <a className="btn-ghost" href={exportUrl(c.codice, null)} style={{ fontSize: 13, padding: '5px 12px' }}>
                  ⬇ Excel (tutte le date)
                </a>
              </div>
            </div>

            {Object.entries(c.date).map(([data, iscritti]) => (
              <div key={data} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {data} <span style={{ color: 'var(--ink-soft, #6b7e8e)', fontWeight: 600 }}>· {iscritti.length} iscritti</span>
                  </div>
                  <a className="btn-ghost" href={exportUrl(c.codice, data)} style={{ fontSize: 12, padding: '3px 10px' }}>
                    ⬇ Excel
                  </a>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--ink-soft, #6b7e8e)', borderBottom: '1px solid var(--linea, #e2e6e1)' }}>
                        <th style={th}>Pos.</th>
                        <th style={th}>Nome</th>
                        <th style={th}>Email</th>
                        <th style={th}>Telefono</th>
                        <th style={th}>Iscritto il</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iscritti.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...td, color: 'var(--ink-soft, #6b7e8e)', fontWeight: 700 }}>{i + 1}</td>
                          <td style={td}>{r.nome}</td>
                          <td style={td}>{r.email}</td>
                          <td style={td}>{r.telefono || '—'}</td>
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
