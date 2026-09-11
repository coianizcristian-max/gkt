import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('benvenuto')
  return { title: t('metaTitle') }
}
export const dynamic = 'force-dynamic'

export default async function BenvenutoPage() {
  // Se il click sul link ha aperto lo stesso browser della registrazione,
  // l'utente qui è già loggato → "Vai alla tua area". Altrimenti (browser
  // diverso) l'email è comunque confermata → "Accedi ora".
  const supabase = await createClient()
  const t = await getTranslations('benvenuto')
  const { data: { user } } = await supabase.auth.getUser()
  const loggato = !!user

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--landing-blue-deep, #0d2137)', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 36px', maxWidth: 440, width: '100%',
        textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.25)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>✅</div>
        <h1 style={{ fontSize: 26, margin: '0 0 12px', color: '#0d2137' }}>{t('titolo')}</h1>
        <p style={{ color: '#5a7080', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          {t('intro')}{loggato ? t('prontoLoggato') : t('prontoNonLoggato')}
        </p>
        <Link href={loggato ? '/dashboard' : '/login'} className="btn" style={{
          display: 'inline-block', background: '#0a7ec2', color: '#fff', padding: '13px 28px',
          borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 15,
        }}>
          {loggato ? t('ctaLoggato') : t('ctaNonLoggato')}
        </Link>
      </div>
    </div>
  )
}
