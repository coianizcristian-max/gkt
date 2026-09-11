import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import SupervisoreNav from '@/app/components/SupervisoreNav'
import { getTranslations, getLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default async function MetrichePage({ searchParams }) {
  const supabase = await createClient()
  const t = await getTranslations('supervisore')
  const c = await getTranslations('common')
  const locale = await getLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('supervisore').eq('id', user.id).maybeSingle()
  if (!profilo?.supervisore) redirect('/')

  const sp = await searchParams
  const OPZIONI = [50, 100, 200, 999]
  const n = OPZIONI.includes(Number(sp?.n)) ? Number(sp.n) : 50

  const { data: stat } = await supabase.rpc('supervisore_statistiche')
  const rec7 = stat?.record_7gg ?? 0
  const rec3 = stat?.record_3gg ?? 0

  const { data: utenti, error } = await supabase.rpc('supervisore_iscritti', { limite: n })
  const righe = utenti ?? []

  // Record creati per utente su finestre 3 / 7 / 30 giorni (vista v_record_creati).
  // I record sono attribuiti all'owner (allenatore): per staff/portieri risultano 0.
  const { data: finestre } = await supabase.rpc('supervisore_record_finestre')
  const recMap = {}
  for (const r of finestre ?? []) recMap[r.utente] = r
  const recDi = (id) => recMap[id] || {}

  const fmtData = (d) => d ? new Date(d).toLocaleString(dl, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—'

  const RUOLO = { allenatore: t('ruoloAllenatore'), staff: t('ruoloStaff'), portiere: t('ruoloPortiere') }
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
  const tdRec = (v) => ({ ...tdR, color: v > 0 ? 'var(--verde, #1f9d55)' : 'var(--ink-soft, #6b7e8e)' })

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titoloMetriche')}</h1>
      </div>
      <div className="content">
        <SupervisoreNav />

        {error && <div className="err" style={{ marginBottom: 16 }}>{t('erroreCaricamento')}{error.message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <Card valore={rec3} label={t('record3')} />
          <Card valore={rec7} label={t('record7')} />
          <Card valore={righe.length} label={t('iscrittiMostrati')} />
        </div>

        <div className="scheda" style={{ maxWidth: 'none' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t('ultimiIscritti')}</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-soft, #6b7e8e)' }}>{t('mostraLabel')}</span>
              {OPZIONI.map((opt) => (
                <Link key={opt} href={`/supervisore/metriche?n=${opt}`}
                  className={opt === n ? 'btn' : 'btn-ghost'}
                  style={{ padding: '4px 12px', fontSize: 13 }}>
                  {opt}
                </Link>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--ink-soft, #6b7e8e)', margin: '0 0 10px' }}>{t('recLegenda')}</p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--ink-soft, #6b7e8e)', borderBottom: '2px solid var(--linea, #e2e6e1)' }}>
                  <th style={th}>#</th>
                  <th style={th}>{t('thEmail')}</th>
                  <th style={th}>{t('thRuolo')}</th>
                  <th style={{ ...th, textAlign: 'center' }}>{t('thMailVerif')}</th>
                  <th style={th}>{t('thIscrittoIl')}</th>
                  <th style={th}>{t('thUltimoAccesso')}</th>
                  <th style={th}>{t('thOrigine')}</th>
                  <th style={th}>{t('thInvitatoDa')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('thStagioni')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('thAllenam')}</th>
                  <th style={{ ...th, textAlign: 'right' }} title={t('recTip')}>{t('thRec3')}</th>
                  <th style={{ ...th, textAlign: 'right' }} title={t('recTip')}>{t('thRec7')}</th>
                  <th style={{ ...th, textAlign: 'right' }} title={t('recTip')}>{t('thRec30')}</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((u, i) => {
                  const rr = recDi(u.id)
                  return (
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
                      <td style={td}>{u.origine === 'invito' ? t('origineInvito') : t('origineDiretta')}</td>
                      <td style={td}>{u.invitato_da || '—'}</td>
                      <td style={tdR}>{u.n_stagioni}</td>
                      <td style={tdR}>{u.n_allenamenti}</td>
                      <td style={tdRec(rr.r3 ?? 0)}>{rr.r3 ?? 0}</td>
                      <td style={tdRec(rr.r7 ?? 0)}>{rr.r7 ?? 0}</td>
                      <td style={tdRec(rr.r30 ?? 0)}>{rr.r30 ?? 0}</td>
                    </tr>
                  )
                })}
                {righe.length === 0 && (
                  <tr><td colSpan={13} style={{ ...td, color: 'var(--ink-soft, #6b7e8e)' }}>{t('nessunDato')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
