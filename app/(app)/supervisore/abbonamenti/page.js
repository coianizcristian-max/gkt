import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'

export const dynamic = 'force-dynamic'

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PIANO_LABEL = { mensile: 'Mensile', annuale: 'Annuale', lifetime: 'A vita' }
const STATO_LABEL = { attivo: '🟢 Attivo', scaduto: '🔴 Scaduto', cancellato: '⛔ Cancellato' }

export default async function AbbonamentiSupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const { data: abbRows } = await supabase
    .from('abbonamenti')
    .select('allenatore_id, piano, stato, scadenza, created_at, stripe_customer_id, stripe_subscription_id')
    .order('created_at', { ascending: false })

  // Carica nomi allenatori
  const ids = [...new Set((abbRows ?? []).map((r) => r.allenatore_id))]
  let nomi = {}
  if (ids.length) {
    const { data: profili } = await supabase.from('profili').select('id, nome_visualizzato').in('id', ids)
    for (const p of profili ?? []) nomi[p.id] = p.nome_visualizzato
  }

  const totAttivi = (abbRows ?? []).filter((r) => r.stato === 'attivo').length

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>Supervisore · Abbonamenti</h1>
      </div>
      <div className="content">
        <SupervisoreNav />
        <div className="scheda" style={{ display: 'flex', gap: 32, marginBottom: 20 }}>
          <div><div style={{ fontSize: 28, fontWeight: 700 }}>{totAttivi}</div><div className="sub-intro" style={{ marginTop: 2 }}>Abbonamenti attivi</div></div>
          <div><div style={{ fontSize: 28, fontWeight: 700 }}>{(abbRows ?? []).length}</div><div className="sub-intro" style={{ marginTop: 2 }}>Totale storici</div></div>
        </div>
        {(abbRows ?? []).length === 0
          ? <div className="empty">Nessun abbonamento registrato.</div>
          : (
            <div className="lista-editor">
              {(abbRows ?? []).map((r, i) => (
                <div key={i} className="lista-riga">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{nomi[r.allenatore_id] ?? r.allenatore_id}</div>
                    <small style={{ color: 'var(--ink-soft)' }}>
                      {PIANO_LABEL[r.piano] ?? r.piano} · dal {fmtData(r.created_at)}
                      {r.piano !== 'lifetime' && <> · scade {fmtData(r.scadenza)}</>}
                    </small>
                  </div>
                  <span>{STATO_LABEL[r.stato] ?? r.stato}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  )
}
