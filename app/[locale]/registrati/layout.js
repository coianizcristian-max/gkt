import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('meta')
  return {
    title: t('registratiTitle'),
    description: t('registratiDescription'),
  }
}

export default function Layout({ children }) { return children }
