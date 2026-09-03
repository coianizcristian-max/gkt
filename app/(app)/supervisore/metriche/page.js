import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'

export const dynamic = 'force-dynamic'

export default async function MetrichePage({ searchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  // filtro 50 / 100 / 200 dalla query string (?n=)
  const sp = await searchParams
  const OPZIONI = [50, 100, 200]
  const n = OPZIONI.includes(Number(sp?.n)) ? Number(sp.n) : 50

  // card metriche (record recenti) dalla funzione esistente
  const { data: stat } = await supabase.rpc('supervisore_statistiche')
  const rec7 = stat?.record_7gg ?? 0
  const rec3 = stat?.record_3gg ?? 0

  // lista iscritti arricchita dalla nuova funzione
  const { data: utenti, error } = await supabase.rpc('supervisore_iscritti', { limite: n })
  const righe = utenti ?? []

  const fmtData = (d) => d ? new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—'

  const RUOLO = { allenatore: 'Allenatore', staff: 'Staff', portiere: 'Portiere' }
  const ruoloLabel = (r) => RUOLO[r] || r || '—'

  const Card = ({ valore, label }) => (
    <div className="scheda" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blu, #0a7ec2)' }}>{valore}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )

  const th = { padding: '8px 6px', whiteSpace: 'nowrap' }
  const td = { padding: '8px 6px', borderBottom: '1px solid var(--linea, #e2e6e1)' }
  const tdR = { ...td, textAlign: 'right', fontWeight: 600 }

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
          <Card valore={righe.length} label="Iscritti mostrati" />
        </div>

        <div className="scheda">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Ultimi iscritti</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-soft, #6b7e8e)' }}>Mostra:</span>
              {OPZIONI.map((opt) => (
                <Link key={opt} href={`/supervisore/metriche?n=${opt}`}
                  className={opt === n ? 'btn' : 'btn-ghost'}
                  style={{ padding: '4px 12px', fontSize: 13 }}>
                  {opt}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--ink-soft, #6b7e8e)', borderBottom: '2px solid var(--linea, #e2e6e1)' }}>
                  <th style={th}>#</th>
                  <th style={th}>Email</th>
                  <th style={th}>Ruolo</th>
                  <th style={{ ...th, textAlign: 'center' }}>Mail verif.</th>
                  <th style={th}>Iscritto il</th>
                  <th style={th}>Ultimo accesso</th>
                  <th style={th}>Origine</th>
                  <th style={th}>Invitato da</th>
                  <th style={{ ...th, textAlign: 'right' }}>Stag.</th>
                  <th style={{ ...th, textAlign: 'right' }}>Allen.</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((u, i) => (
                  <tr key={u.id ?? i}>
                    <td style={{ ...td, color: 'var(--ink-soft, #6b7e8e)' }}>{i + 1}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{ruoloLabel(u.ruolo)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {u.email_verificata
                        ? <span style={{ color: 'var(--verde, #1f9d55)', fontWeight: 700 }}>✓</span>
                        : <span style={{ color: 'var(--rosso, #d64545)', fontWeight: 700 }}>✗</span>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtData(u.iscritto_il)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtData(u.ultimo_accesso)}</td>
                    <td style={td}>{u.origine === 'invito' ? 'Invito' : 'Diretta'}</td>
                    <td style={td}>{u.invitato_da || '—'}</td>
                    <td style={tdR}>{u.n_stagioni}</td>
                    <td style={tdR}>{u.n_allenamenti}</td>
                  </tr>
                ))}
                {righe.length === 0 && (
                  <tr><td colSpan={10} style={{ ...td, color: 'var(--ink-soft, #6b7e8e)' }}>Nessun dato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
