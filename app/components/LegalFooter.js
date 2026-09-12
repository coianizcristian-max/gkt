import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

// Footer legale per le pagine pubbliche: link a informativa/cookie/termini +
// identificazione del titolare del trattamento (accessibile da ogni pagina,
// come richiesto dal Garante). L'area riservata ha gia' il suo footer.
export default async function LegalFooter() {
  const t = await getTranslations('sidebar')
  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '18px 20px', textAlign: 'center', fontSize: 12, color: 'var(--ink-soft, #667)', lineHeight: 1.7 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
        <Link href="/privacy-policy" style={{ color: 'inherit' }}>{t('privacy')}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/cookie-policy" style={{ color: 'inherit' }}>{t('cookie')}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/termini-di-servizio" style={{ color: 'inherit' }}>{t('termini')}</Link>
      </div>
      <div>GKSeason di Coianiz Cristian · Via Salgaroni 18, 36030 Montecchio Precalcino (VI) · C.F. CNZCST76T22Z133X · info@gkseason.it</div>
    </footer>
  )
}
