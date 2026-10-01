import LegalFooter from '@/app/components/LegalFooter'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('cercaTitle'),
    description: t('cercaDescription'),
    openGraph: {
      title: t('cercaOgTitle'),
      description: t('cercaOgDescription'),
    },
  }
}

export default async function Layout({ children, params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <>{children}<LegalFooter /></>
}
