import { getTranslations, getLocale } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('legalPrivacy')
  const c = await getTranslations('common')
  const locale = await getLocale()
  return { title: t('metaTitle'), description: t('metaDescription') }
}

export default async function PrivacyPolicy() {
  const t = await getTranslations('legalPrivacy')
  const c = await getTranslations('common')
  const locale = await getLocale()
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>{t('title')}</h1>
        <p className="legal-updated">{t('updated')}</p>
        {locale !== 'it' && <p className="legal-updated" style={{ fontStyle: 'italic' }}>{c('legalCortesia')}</p>}

        <section>
          <h2>{t('s1h')}</h2>
          <p>
            {t('s1intro')}<br />
            <strong>Coianiz Cristian</strong><br />
            Via Salgaroni 18, Montecchio Precalcino (VI)<br />
            {t('s1cf')}: CNZCST76T22Z133X<br />
            Email: <a href="mailto:info@gkseason.it">info@gkseason.it</a>
          </p>
        </section>

        <section>
          <h2>{t('s2h')}</h2>
          <p>{t('s2intro')}</p>
          <ul>
            {t.raw('s2items').map((it, i) => (
              <li key={i}><strong>{it.term}</strong>: {it.desc}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('s3h')}</h2>
          <table className="legal-table">
            <thead><tr>{t.raw('s3cols').map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {t.raw('s3rows').map((r, i) => (
                <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>{t('s4h')}</h2>
          <p>{t('s4intro')}</p>
          <ul>{t.raw('s4items').map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>

        <section>
          <h2>{t('s5h')}</h2>
          <p>{t('s5intro')}</p>
          <ul>
            {t.raw('s5items').map((it, i) => (
              <li key={i}><strong>{it.term}</strong> {it.desc}</li>
            ))}
          </ul>
          <p>{t('s5outro')}</p>
        </section>

        <section>
          <h2>{t('s6h')}</h2>
          <p>{t('s6')}</p>
        </section>

        <section>
          <h2>{t('s7h')}</h2>
          <p>{t('s7intro')}</p>
          <ul>
            {t.raw('s7items').map((it, i) => (
              <li key={i}><strong>{it.term}</strong>{it.desc}</li>
            ))}
          </ul>
          <p>
            {t.rich('s7outro', {
              mail: (ch) => <a href="mailto:info@gkseason.it">{ch}</a>,
              garante: (ch) => <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">{ch}</a>,
            })}
          </p>
        </section>

        <section>
          <h2>{t('s8h')}</h2>
          <p>{t('s8')}</p>
        </section>

        <section>
          <h2>{t('s9h')}</h2>
          <p>
            {t.rich('s9', { cookie: (ch) => <a href="/cookie-policy">{ch}</a> })}
          </p>
        </section>

        <section>
          <h2>{t('s10h')}</h2>
          <p>{t('s10')}</p>
        </section>
      </div>
    </div>
  )
}
