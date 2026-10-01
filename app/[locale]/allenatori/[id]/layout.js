import LegalFooter from '@/app/components/LegalFooter'
import { setRequestLocale } from 'next-intl/server'

export default async function Layout({ children, params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <>{children}<LegalFooter /></>
}
