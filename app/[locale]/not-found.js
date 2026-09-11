import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export default function NotFound() {
  const t = useTranslations('notFound')
  return (
    <div
      style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        textAlign: 'center', padding: 24,
      }}
    >
      <h1 style={{ fontSize: 64, margin: 0, lineHeight: 1 }}>404</h1>
      <p style={{ fontSize: 18, margin: 0, opacity: 0.8 }}>{t('message')}</p>
      <Link
        href="/"
        style={{
          marginTop: 8, padding: '10px 18px', borderRadius: 8,
          background: '#0a5a8a', color: '#fff', textDecoration: 'none', fontWeight: 700,
        }}
      >
        {t('home')}
      </Link>
    </div>
  )
}
