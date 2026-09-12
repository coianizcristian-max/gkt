import LegalFooter from '@/app/components/LegalFooter'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('meta')
  return {
    title: t('cercaTitle'),
    description: t('cercaDescription'),
    openGraph: {
      title: t('cercaOgTitle'),
      description: t('cercaOgDescription'),
    },
  }
}

export default function Layout({ children }) {
  return <>{children}<LegalFooter /></>
}
