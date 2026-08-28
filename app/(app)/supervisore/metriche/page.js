import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'

export const dynamic = 'force-dynamic'

export default async function MetrichePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data, error } = await supabase.rpc('supervisore_statistiche')
  const utenti = data?.utenti ?? []
  const rec7 = data?.record_7gg ?? 0
  const rec3 = data?.record_3gg ?? 0

  const fmtData = (d) => new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const Card = ({ valore, label }) => (
    <div className="scheda" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blu, #0a7ec2)' }}>{valore}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )

  const th = { padding: '8px 6px' }
  const td = { padding: '8px 6px', borderBottom: '1px solid var(--linea, #e2e6e1)' }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Metriche</h1>
      </div>
      <div className="content">
        <SupervisoreNav />

        {error && <div className="err" style={{ marginBottom: 16 }}>Errore nel caricamento: {error.message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <Card valore={rec3} label="Record ultimi 3 giorni" />
          <Card valore={rec7} label="Record ultimi 7 giorni" />
          <Card valore={utenti.length} label="Ultimi iscritti mostrati" />
        </div>

        <div className="scheda">
          <h3 style={{ marginTop: 0 }}>Ultimi 50 iscritti</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--ink-soft, #6b7e8e)', borderBottom: '2px solid var(--linea, #e2e6e1)' }}>
                  <th style={th}>#</th>
                  <th style={th}>Email</th>
                  <th style={th}>Iscritto il</th>
                  <th style={{ ...th, textAlign: 'right' }}>Stagioni</th>
                  <th style={{ ...th, textAlign: 'right' }}>Allenamenti</th>
                </tr>
              </thead>
              <tbody>
                {utenti.map((u, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: 'var(--ink-soft, #6b7e8e)' }}>{i + 1}</td>
                    <td style={td}>{u.email}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtData(u.created_at)}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{u.stagioni}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{u.allenamenti}</td>
                  </tr>
                ))}
                {utenti.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, color: 'var(--ink-soft, #6b7e8e)' }}>Nessun dato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
