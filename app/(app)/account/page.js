import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CouponBox from '@/app/components/CouponBox'
import { hasAbbonamento } from '@/lib/gating'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account | GKT' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profilo },
    abbonamentoAttivo,
  ] = await Promise.all([
    supabase.from('profili').select('ruolo, supervisore').eq('id', user.id).maybeSingle(),
    hasAbbonamento(supabase, user.id),
  ])

  // Dettaglio abbonamento o coupon attivo
  const { data: abbRow } = await supabase.from('abbonamenti')
    .select('piano, scadenza, created_at')
    .eq('allenatore_id', user.id).eq('stato', 'attivo').maybeSingle()

  const { data: couponRow } = await supabase.from('coupon_utilizzi')
    .select('scade_il, coupon:coupon_id(codice, durata_gg)')
    .eq('utente_id', user.id)
    .gt('scade_il', new Date().toISOString())
    .order('scade_il', { ascending: false }).limit(1).maybeSingle()

  const giorniCoupon = couponRow
    ? Math.ceil((new Date(couponRow.scade_il) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const ruoloLabel = {
    allenatore: 'Allenatore / Preparatore',
    staff: 'Staff tecnico',
    portiere: 'Portiere',
  }[profilo?.ruolo] ?? profilo?.ruolo ?? '—'

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Impostazioni</div>
        <h1>Il mio account</h1>
      </div>
      <div className="content">

        {/* Info utente */}
        <div className="scheda" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Dati di accesso</h3>
          <div className="form-grid">
            <div>
              <label className="campo-label">Email</label>
              <div className="campo-valore">{user.email}</div>
            </div>
            <div>
              <label className="campo-label">Ruolo</label>
              <div className="campo-valore">{ruoloLabel}{profilo?.supervisore ? ' · Supervisore' : ''}</div>
            </div>
            <div>
              <label className="campo-label">ID utente</label>
              <div className="campo-valore" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{user.id}</div>
            </div>
          </div>
        </div>

        {/* Stato abbonamento */}
        <div className="scheda" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Stato abbonamento</h3>

          {abbRow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Piano {abbRow.piano === 'lifetime' ? 'Lifetime' : abbRow.piano === 'annuale' ? 'Annuale' : 'Mensile'} attivo
                </div>
                {abbRow.scadenza && abbRow.piano !== 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                    Rinnovo il {new Date(abbRow.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                {abbRow.piano === 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Accesso a vita — nessuna scadenza</div>
                )}
              </div>
            </div>
          ) : couponRow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>🎟</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Accesso gratuito attivo — codice <span style={{ fontFamily: 'monospace' }}>{couponRow.coupon?.codice}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Scade il {new Date(couponRow.scade_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} ({giorniCoupon} giorni rimasti)
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>🔓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Nessun abbonamento attivo</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Hai accesso alle funzionalità gratuite. Abbonati per sbloccare tutto.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Box coupon — sempre visibile se non ha abbonamento Stripe attivo */}
        {!abbRow && (
          <CouponBox />
        )}

      </div>
    </>
  )
}
