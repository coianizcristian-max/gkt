import LegalFooter from '@/app/components/LegalFooter'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('loginTitle'),
    description: t('loginDescription'),
    robots: { index: false, follow: true },
  }
}

export default async function Layout({ children, params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <>{children}<LegalFooter /></>
}
