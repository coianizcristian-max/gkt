import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('legalTermini')
  const c = await getTranslations('common')
  const locale = await getLocale()
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export default async function TerminiDiServizio() {
  const t = await getTranslations('legalTermini')
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>{t('title')}</h1>
        <p className="legal-updated">{t('updated')}</p>
        {locale !== 'it' && <p className="legal-updated" style={{ fontStyle: 'italic' }}>{c('legalCortesia')}</p>}

        <section><h2>{t('s1h')}</h2><p>{t('s1')}</p></section>

        <section>
          <h2>{t('s2h')}</h2>
          <p>{t('s2a')}</p>
          <p>{t('s2b')}</p>
        </section>

        <section>
          <h2>{t('s3h')}</h2>
          <p>{t('s3intro')}</p>
          <ul>{t.raw('s3items').map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>

        <section>
          <h2>{t('s4h')}</h2>
          <p>{t('s4intro')}</p>
          <ul>{t.raw('s4items').map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>

        <section>
          <h2>{t('s5h')}</h2>
          <p>{t('s5intro')}</p>
          <ul>{t.raw('s5items').map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>

        <section>
          <h2>{t('s6h')}</h2>
          <p>{t('s6a')}</p>
          <p>{t('s6b')}</p>
        </section>

        <section>
          <h2>{t('s7h')}</h2>
          <p>{t('s7a')}</p>
          <p>{t('s7b')}</p>
        </section>

        <section><h2>{t('s8h')}</h2><p>{t('s8')}</p></section>

        <section>
          <h2>{t('s9h')}</h2>
          <p>{t('s9a')}</p>
          <p>{t('s9b')}</p>
        </section>

        <section><h2>{t('s10h')}</h2><p>{t('s10')}</p></section>

        <section>
          <h2>{t('s11h')}</h2>
          <p>{t('s11a')}</p>
          <p>{t('s11b')}</p>
        </section>

        <section>
          <h2>{t('s12h')}</h2>
          <p>{t.rich('s12', { mail: (ch) => <a href="mailto:info@gkseason.it">{ch}</a> })}</p>
        </section>
      </div>
    </div>
  )
}
