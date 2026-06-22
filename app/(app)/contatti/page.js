import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function fmtData(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function ContattiRicevutiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (profilo?.ruolo !== 'allenatore' && profilo?.ruolo !== 'staff') redirect('/dashboard')

  const { data: messaggi } = await supabase
    .from('messaggi_contatto')
    .select('id, nome_mittente, email_mittente, telefono_mittente, societa, messaggio, letto, created_at')
    .eq('allenatore_id', user.id)
    .order('created_at', { ascending: false })

  const nonLetti = (messaggi ?? []).filter((m) => !m.letto).length

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Area riservata</div>
        <h1>
          Contatti ricevuti
          {nonLetti > 0 && (
            <span style={{
              marginLeft: 10, background: 'var(--azzurro)', color: '#fff',
              borderRadius: 20, fontSize: 13, padding: '2px 10px', fontWeight: 700,
            }}>
              {nonLetti} nuovi
            </span>
          )}
        </h1>
      </div>
      <div className="content">
        {(!messaggi || messaggi.length === 0) ? (
          <div className="empty">
            <p>Nessun messaggio ricevuto ancora.</p>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Quando qualcuno ti contatta tramite il profilo pubblico, i messaggi appariranno qui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messaggi.map((m) => (
              <MessaggioCard key={m.id} messaggio={m} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function MessaggioCard({ messaggio: m }) {
  return (
    <div className="scheda" style={{
      borderLeft: m.letto ? undefined : '4px solid var(--azzurro)',
      position: 'relative',
    }}>
      {!m.letto && (
        <span style={{
          position: 'absolute', top: 12, right: 16,
          background: 'var(--azzurro)', color: '#fff',
          borderRadius: 20, fontSize: 11, padding: '2px 8px', fontWeight: 700,
        }}>
          Nuovo
        </span>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: 'var(--azzurro)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>
          {(m.nome_mittente || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{m.nome_mittente}</div>
          {m.societa && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{m.societa}</div>}
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{fmtData(m.created_at)}</div>
        </div>
      </div>

      <p style={{ margin: '0 0 12px', lineHeight: 1.65, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
        {m.messaggio}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--linea)' }}>
        <a href={`mailto:${m.email_mittente}`} className="btn" style={{ fontSize: 13, padding: '6px 14px' }}>
          Rispondi via email
        </a>
        {m.telefono_mittente && (
          <a href={`tel:${m.telefono_mittente}`} className="btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}>
            📞 {m.telefono_mittente}
          </a>
        )}
        {!m.letto && (
          <MarcaLettoButton id={m.id} />
        )}
      </div>
    </div>
  )
}

// Bottone client-side per marcare come letto
import MarcaLettoButton from './MarcaLettoButton'
