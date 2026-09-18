import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CouponBox from '@/app/components/CouponBox'
import { hasAbbonamento } from '@/lib/gating'
import { rigaValida, getAdmin } from '@/lib/stripeAbbonamenti'
import DisdiciButton from '@/app/components/DisdiciButton'
import CollegaSupervisoreBox from '@/app/components/CollegaSupervisoreBox'
import CommentiRicevuti from '@/app/components/CommentiRicevuti'
import EliminaAccountBox from '@/app/components/EliminaAccountBox'
import { getTranslations, getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account | GKSeason' }

export default async function AccountPage() {
  const supabase = await createClient()
  const t = await getTranslations('account')
  const locale = await getLocale()
  const dateLoc = locale === 'it' ? 'it-IT' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : 'en-GB'
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
  // Ultima riga dell'utente; conta solo se dà ancora accesso (prima un
  // abbonamento scaduto compariva come "Attivo, rinnovo il <data passata>").
  // Lettura con il client di servizio, SEMPRE filtrata sull'utente loggato:
  // l'esito non dipende dalle regole RLS della tabella.
  const admin = getAdmin()
  const { data: abbRows } = await admin.from('abbonamenti')
    .select('piano, scadenza, created_at, stato, stripe_subscription_id')
    .eq('allenatore_id', user.id)
    .order('created_at', { ascending: false }).limit(1)
  const ultimaAbb = abbRows?.[0] ?? null
  const abbRow = ultimaAbb && ultimaAbb.stato !== 'prova' && rigaValida(ultimaAbb) ? ultimaAbb : null
  const provaRow = ultimaAbb && ultimaAbb.stato === 'prova' && rigaValida(ultimaAbb) ? ultimaAbb : null
  const giorniProva = provaRow ? Math.ceil((new Date(provaRow.scadenza) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const fmtD = (d) => new Date(d).toLocaleDateString(dateLoc, { day: 'numeric', month: 'long', year: 'numeric' })

  const { data: couponRow } = await admin.from('coupon_utilizzi')
    .select('scade_il, coupon:coupon_id(codice, durata_gg)')
    .eq('utente_id', user.id)
    .gt('scade_il', new Date().toISOString())
    .order('scade_il', { ascending: false }).limit(1).maybeSingle()

  const giorniCoupon = couponRow
    ? Math.ceil((new Date(couponRow.scade_il) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const ruoloLabel = {
    allenatore: t('ruoloAllenatore'),
    staff: t('ruoloStaff'),
    portiere: t('ruoloPortiere'),
  }[profilo?.ruolo] ?? profilo?.ruolo ?? '—'

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">

        {/* Info utente */}
        <div className="scheda" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{t('datiAccesso')}</h3>
          <div className="form-grid">
            <div>
              <label className="campo-label">Email</label>
              <div className="campo-valore">{user.email}</div>
            </div>
            <div>
              <label className="campo-label">{t('ruolo')}</label>
              <div className="campo-valore">{ruoloLabel}{profilo?.supervisore ? t('supervisoreSuffix') : ''}</div>
            </div>
            <div>
              <label className="campo-label">{t('idUtente')}</label>
              <div className="campo-valore" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{user.id}</div>
            </div>
          </div>
        </div>

        {/* Stato abbonamento */}
        <div className="scheda" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{t('statoAbbonamento')}</h3>

          {abbRow ? (
            <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>{abbRow.stato === 'disdetto' ? '⏳' : '✅'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {t('piano', { tipo: abbRow.piano === 'lifetime' ? t('pianoLifetime') : abbRow.piano === 'annuale' ? t('pianoAnnuale') : t('pianoMensile') })}
                  {abbRow.stato === 'disdetto'
                    ? <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--rosso)', background: 'rgba(192,57,43,0.08)', padding: '2px 8px', borderRadius: 20 }}>{t('disdetto')}</span>
                    : <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--campo)', background: 'rgba(46,158,91,0.08)', padding: '2px 8px', borderRadius: 20 }}>{t('attivo')}</span>}
                </div>
                {abbRow.scadenza && abbRow.piano !== 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {abbRow.stato === 'disdetto'
                      ? t.rich('attivoFinoAl', { data: new Date(abbRow.scadenza).toLocaleDateString(dateLoc, { day: 'numeric', month: 'long', year: 'numeric' }), b: (ch) => <b>{ch}</b> })
                      : abbRow.stripe_subscription_id
                        ? t('rinnovoIl', { data: fmtD(abbRow.scadenza) })
                        : t('validoFinoAl', { data: fmtD(abbRow.scadenza) })}
                  </div>
                )}
                {abbRow.piano === 'lifetime' && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t('accessoVita')}</div>
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
                  {t.rich('accessoGratuito', { valore: couponRow.coupon?.codice, codice: (ch) => <span style={{ fontFamily: 'monospace' }}>{ch}</span> })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {t('scadeIl', { data: new Date(couponRow.scade_il).toLocaleDateString(dateLoc, { day: 'numeric', month: 'long', year: 'numeric' }), giorni: giorniCoupon })}
                </div>
              </div>
            </div>
          ) : provaRow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>🎁</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t('provaTitolo')}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {t('provaFino', { data: fmtD(provaRow.scadenza), giorni: giorniProva })}
                </div>
              </div>
            </div>
          ) : profilo?.ruolo === 'staff' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>{abbonamentoAttivo ? '✅' : '🔓'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t('staffTitolo')}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {abbonamentoAttivo ? t('staffNotaOk') : t('staffNotaNo')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>🔓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t('nessunAbbonamento')}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {t('gratisNota')}
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

        {/* Cancellazione account e dati (art. 17 GDPR) */}
        <EliminaAccountBox />

      </div>
    </>
  )
}
