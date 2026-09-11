import { Link } from '@/i18n/routing'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export const dynamic = 'force-static'

const BASE = 'https://www.gkseason.it'
const PATH = '/domande-frequenti'
const OG_LOCALE = { it: 'it_IT', en: 'en_GB', de: 'de_DE', es: 'es_ES' }
const IDS = ['1', '2', '3', '4', '5', '6', '7', '8']

const urlFor = (locale) => `${BASE}${locale === routing.defaultLocale ? '' : '/' + locale}${PATH}`

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'faqPubblica' })
  const languages = {}
  for (const l of routing.locales) languages[l] = urlFor(l)
  languages['x-default'] = urlFor(routing.defaultLocale)
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: urlFor(locale), languages },
    openGraph: { type: 'website', locale: OG_LOCALE[locale] || 'it_IT', title: t('metaTitle'), description: t('metaDescription'), url: urlFor(locale) },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  }
}

export default async function DomandeFrequentiPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('faqPubblica')

  const faqs = IDS.map((i) => ({ q: t(`q${i}`), a: t(`a${i}`) }))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="content" style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: 'var(--blu, #0a7ec2)', textDecoration: 'none' }}>← GKSeason</Link>
      </div>
      <h1>{t('title')}</h1>
      <p className="sub-intro">{t('intro')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {faqs.map((f, i) => (
          <details key={i} className="scheda" style={{ padding: '14px 18px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
            <p className="sub-intro" style={{ marginTop: 10, marginBottom: 0 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
