import LegalFooter from '@/app/components/LegalFooter'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('meta')
  return {
    title: t('loginTitle'),
    description: t('loginDescription'),
    robots: { index: false, follow: true },
  }
}

export default function Layout({ children }) { return <>{children}<LegalFooter /></> }
