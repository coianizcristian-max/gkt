import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('legalCookie')
  const c = await getTranslations('common')
  const locale = await getLocale()
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export default async function CookiePolicy() {
  const t = await getTranslations('legalCookie')
  const Table = ({ ck }) => (
    <table className="legal-table">
      <thead><tr>{t.raw('cols').map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>
        {t.raw(ck).map((r, i) => (
          <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>{t('title')}</h1>
        <p className="legal-updated">{t('updated')}</p>
        {locale !== 'it' && <p className="legal-updated" style={{ fontStyle: 'italic' }}>{c('legalCortesia')}</p>}

        <section>
          <h2>{t('s1h')}</h2>
          <p>{t('s1')}</p>
        </section>

        <section>
          <h2>{t('s2h')}</h2>
          <h3>{t('s2techH')}</h3>
          <p>{t('s2techIntro')}</p>
          <Table ck="s2techRows" />
          <h3>{t('s2anaH')}</h3>
          <p>{t('s2anaIntro')}</p>
          <Table ck="s2anaRows" />
        </section>

        <section>
          <h2>{t('s3h')}</h2>
          <p>{t('s3intro')}</p>
          <ul>
            {t.raw('s3items').map((it, i) => (
              <li key={i}><strong>{it.term}</strong>: {it.desc}</li>
            ))}
          </ul>
          <p>{t('s3guideIntro')}</p>
          <ul>
            {t.raw('s3guide').map((g, i) => (
              <li key={i}><a href={g.url} target="_blank" rel="noopener noreferrer">{g.label}</a></li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('s4h')}</h2>
          <p>
            {t.rich('s4', { link: (ch) => <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">{ch}</a> })}
          </p>
        </section>

        <section>
          <h2>{t('s5h')}</h2>
          <p>{t('s5')}</p>
        </section>

        <section>
          <h2>{t('s6h')}</h2>
          <p>
            {t.rich('s6', { mail: (ch) => <a href="mailto:info@gkseason.it">{ch}</a> })}
          </p>
        </section>
      </div>
    </div>
  )
}
