import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CouponBox from '@/app/components/CouponBox'
import { hasAbbonamento } from '@/lib/gating'
import DisdiciButton from '@/app/components/DisdiciButton'
import CollegaSupervisoreBox from '@/app/components/CollegaSupervisoreBox'
import CommentiRicevuti from '@/app/components/CommentiRicevuti'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account | GKSeason' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profilo },
    abbonamentoAttivo,
  ] = await Promise.all([
    supabase.from('profili').select('ruolo, supervisore, supervisore_id').eq('id', user.id).maybeSingle(),
    hasAbbonamento(supabase, user.id),
  ])

  // Dettaglio abbonamento o coupon attivo
  const { data: abbRow } = await supabase.from('abbonamenti')
    .select('piano, scadenza, created_at, stato')
    .eq('allenatore_id', user.id).in('stato', ['attivo', 'disdetto'])
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

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
            <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>{abbRow.stato === 'disdetto' ? '⏳' : '✅'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Piano {abbRow.piano === 'lifetime' ? 'Lifetime' : abbRow.piano === 'annuale' ? 'Annuale' : 'Mensile'}
                  {abbRow.stato === 'disdetto'
                    ? <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--rosso)', background: 'rgba(192,57,43,0.08)', padding: '2px 8px', borderRadius: 20 }}>Disdetto</span>
                    : <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--campo)', background: 'rgba(46,158,91,0.08)', padding: '2px 8px', borderRadius: 20 }}>Attivo</span>}
                </div>
                {abbRow.scadenza && abbRow.piano !== 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {abbRow.stato === 'disdetto'
                      ? <>Attivo fino al <b>{new Date(abbRow.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>, poi tornerai al piano gratuito</>
                      : <>Rinnovo il {new Date(abbRow.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</>}
                  </div>
                )}
                {abbRow.piano === 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Accesso a vita — nessuna scadenza</div>
                )}
              </div>
            </div>
            {abbRow.stato === 'attivo' && abbRow.piano !== 'lifetime' && (
              <DisdiciButton scadenza={abbRow.scadenza} />
            )}
            </>
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

        {/* Collegamento supervisore — solo per allenatori */}
        {profilo?.ruolo === 'allenatore' && (
          <CollegaSupervisoreBox supervisoreAttuale={profilo?.supervisore_id ?? null} />
        )}

        {/* Commenti ricevuti dal supervisore — visibili al preparatore collegato */}
        {profilo?.ruolo === 'allenatore' && profilo?.supervisore_id && (
          <CommentiRicevuti preparatoreId={user.id} />
        )}

      </div>
    </>
  )
}
