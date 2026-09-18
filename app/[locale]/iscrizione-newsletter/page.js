import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'

// Pagina /iscrizione-newsletter: atterraggio dei link nelle mail della newsletter:
//   ?esito=confermata   -> dopo il clic su "Conferma iscrizione"
//   ?esito=disiscritto  -> dopo "Disiscriviti" / "Annulla l'iscrizione"
//   ?esito=errore       -> link non valido o scaduto
// Pubblica e non indicizzata.

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('newsletterPagina')
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

const ESITI = ['confermata', 'disiscritto', 'errore']

export default async function NewsletterPagina({ searchParams }) {
  const t = await getTranslations('newsletterPagina')
  const sp = await searchParams
  const esito = ESITI.includes(sp?.esito) ? sp.esito : 'errore'

  const icona = { confermata: '✓', disiscritto: '👋', errore: '!' }[esito]
  const coloreIcona = { confermata: '#1f9d55', disiscritto: '#0a7ec2', errore: '#d6493b' }[esito]

  const btn = {
    display: 'inline-block', background: '#0a7ec2', color: '#fff', textDecoration: 'none',
    padding: '14px 28px', borderRadius: 10, fontWeight: 700, fontSize: 16,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: '#eef2f5' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ background: 'linear-gradient(135deg,#0a5a8a 0%,#0a7ec2 100%)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#cfe4f2' }}>
            {t('eyebrow')}
          </div>
          <img src="/gk_circle_white.png" alt="GKSeason" width={44} height={46} style={{ display: 'block' }} />
        </div>

        <div style={{ padding: '32px 28px 30px', textAlign: 'center', color: '#2a3b47' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${coloreIcona}1a`, color: coloreIcona, fontSize: 26, fontWeight: 800,
          }}>{icona}</div>

          <h1 style={{ fontSize: 24, margin: '0 0 10px', lineHeight: 1.25 }}>{t(`${esito}Titolo`)}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, margin: '0 0 24px', color: '#4a5d6b' }}>{t(`${esito}Testo`)}</p>

          {esito === 'confermata' ? (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 18px', fontWeight: 600 }}>{t('demoInvito')}</p>
              {/* /d e' una route del sito fuori dalle lingue: link semplice */}
              <a href="/d?utm_source=newsletter&utm_medium=pagina&utm_campaign=conferma" style={btn}>{t('demoBottone')}</a>
              <div style={{ marginTop: 16, fontSize: 14 }}>
                <Link href="/" style={{ color: '#0a7ec2' }}>{t('tornaSito')}</Link>
              </div>
            </>
          ) : (
            <Link href="/" style={btn}>{t('tornaSito')}</Link>
          )}
        </div>
      </div>
    </div>
  )
}
