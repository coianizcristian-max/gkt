import Link from 'next/link'
import Image from 'next/image'
import CercaAllenatoriBox from '@/app/components/CercaAllenatoriBox'
import AreaLoginCta from '@/app/components/AreaLoginCta'
import NewsletterSignup from '@/app/components/NewsletterSignup'
import MobileNav from '@/app/components/MobileNav'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { renderTesto } from '@/lib/renderTesto'
import { FUNZIONALITA, getGatingConfig } from '@/lib/gating'

// Pagina pubblica: il contenuto (sito_sezioni) cambia solo quando viene
// modificato da Supervisore → Sito, quindi si può mettere in cache e
// rigenerare in background invece di interrogare il database a ogni visita.
// NB: usiamo un client Supabase "anonimo" (non quello legato ai cookie di
// sessione) proprio perché anche solo istanziare il client con i cookie
// costringerebbe Next.js a trattare la pagina come dinamica, vanificando
// la cache. Il pulsante "sei loggato?" è isolato in un componente client
// (AreaLoginCta) che controlla la sessione nel browser.
export const revalidate = 60

const DEFAULT_PREZZI = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

function getPublicClient() {
  return createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function gruppaPerTipo(lista) {
  const gruppi = []
  for (const sez of lista) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.tipo === sez.tipo) {
      ultimo.sezioni.push(sez)
    } else {
      gruppi.push({ tipo: sez.tipo, sezioni: [sez] })
    }
  }
  return gruppi
}

export default async function Home() {
  const supabase = getPublicClient()
  const [{ data: sezioni }, { data: prezziRows }, gatingCfg] = await Promise.all([
    supabase.from('sito_sezioni').select('*').eq('visibile', true).order('ordine'),
    supabase.from('funzionalita_config').select('chiave, label').like('chiave', 'prezzo_%'),
    getGatingConfig(supabase),
  ])

  const funzionalitaGratis = []
  const funzionalitaTutte = []
  for (const [chiave, def] of Object.entries(FUNZIONALITA)) {
    funzionalitaTutte.push(def.label)
    if (gatingCfg.config[chiave]) funzionalitaGratis.push(def.label)
  }

  const prezzi = structuredClone(DEFAULT_PREZZI)
  for (const r of (prezziRows ?? [])) {
    const m = r.chiave.match(/^prezzo_(allenatore|portiere)_(mensile|annuale|lifetime)$/)
    if (m && r.label) prezzi[m[1]][m[2]] = r.label
  }

  const lista = sezioni ?? []
  const gruppi = gruppaPerTipo(lista)
  const hasPrezzi = gruppi.some((g) => g.tipo === 'prezzi')
  const hasSocial = gruppi.some((g) => g.tipo === 'social')
  const hasFaq = gruppi.some((g) => g.tipo === 'faq')
  const navLinks = [
    { href: '#ricerca-allenatori', label: 'Cerca Preparatore Portieri' },
    ...(hasFaq ? [{ href: '#faq', label: 'FAQ' }] : []),
    ...(hasSocial ? [{ href: '#social', label: 'Social' }] : []),
    ...(hasPrezzi ? [{ href: '#prezzi', label: 'Prezzi' }] : []),
  ]

  // Calcola in anticipo lo sfondo di ogni singola sezione (non solo di ogni
  // gruppo), per garantire sempre uno stacco visibile con quella prima E
  // quella dopo, anche quando ci sono più blocchi Contenuto/Testo di fila.
  const SFONDO_FISSO = { hero: 'scuro', vantaggio: 'alt', banner: 'scuro', social: 'bianco', prezzi: 'alt', faq: 'bianco' }
  const unita = []
  gruppi.forEach((g, gi) => {
    if (SFONDO_FISSO[g.tipo]) {
      unita.push({ gi, ci: null, fisso: SFONDO_FISSO[g.tipo] })
    } else if (g.tipo === 'contenuto' || g.tipo === 'testo') {
      g.sezioni.forEach((_, ci) => unita.push({ gi, ci, fisso: null }))
    }
  })
  for (let i = 0; i < unita.length; i++) {
    if (unita[i].fisso) { unita[i].valore = unita[i].fisso; continue }
    const prev = i > 0 ? unita[i - 1].valore : null
    const next = (i < unita.length - 1 && unita[i + 1].fisso) ? unita[i + 1].fisso : null
    const candidati = ['alt', 'bianco'].filter((c) => c !== prev && c !== next)
    unita[i].valore = candidati[0] ?? (prev === 'alt' ? 'bianco' : 'alt')
  }
  // Mappa di comodo per leggere il valore durante il render: sfondoSezione[gi][ci ?? '_'] = 'alt' | 'bianco'
  const sfondoSezione = {}
  for (const u of unita) {
    (sfondoSezione[u.gi] ??= {})[u.ci ?? '_'] = u.valore
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GKSeason',
    url: 'https://www.gkseason.it',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    description: "Piattaforma per preparatori dei portieri: calendario allenamenti, valutazioni, statistiche, esercizi e gestione squadra in un'unica app.",
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Gratis con promo lancio' },
    inLanguage: 'it',
  }

  return (
    <div className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Navbar fissa ── */}
      <header className="landing-top">
        <div className="brand">
          <div className="glove" style={{ width: 32, height: 32, fontSize: 13 }}>GK</div>
          <div>
            <b>GKSeason</b>
            <span>Gestione portieri</span>
          </div>
        </div>
        <nav className="landing-nav-links">
          <a href="#ricerca-allenatori">Cerca Preparatore Portieri</a>
          {hasFaq && <a href="#faq">FAQ</a>}
          {hasSocial && <a href="#social">Social</a>}
          {hasPrezzi && <a href="#prezzi">Prezzi</a>}
          <AreaLoginCta variant="nav" />
        </nav>
        <MobileNav links={navLinks} />
      </header>

      {/* ── Sezioni dal DB in ordine ── */}
      {gruppi.map((gruppo, gi) => {
        // Salta sezioni senza contenuto reale (titolo di default e nessun testo/immagine)
        const sezsFiltrate = gruppo.sezioni.filter(s =>
          s.tipo === 'prezzi' || s.immagine_url || s.testo || s.link_url || s.link_url_2 || (s.titolo && s.titolo !== 'Nuova sezione')
        )
        if (sezsFiltrate.length === 0) return null
        const gruppoFiltrato = { ...gruppo, sezioni: sezsFiltrate }
        const { tipo, sezioni: sezs } = gruppoFiltrato

        if (tipo === 'hero') {
          const h = sezs[0]
          // Se c'è immagine mobile usa <picture> nativo (necessario per servire foto
          // diverse per dispositivo), altrimenti next/image con priority (è l'elemento
          // LCP della pagina: la prima cosa grande che l'utente vede).
          const hasMobileHero = !!h.immagine_mobile_url
          const section = (
            <div key={gi} className="landing-hero" data-hasimg={h.immagine_url ? '1' : '0'} style={{ position: 'relative', overflow: 'hidden' }}>
              {hasMobileHero && (
                <picture style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                  <source media="(max-width: 768px)" srcSet={h.immagine_mobile_url} />
                  <img src={h.immagine_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </picture>
              )}
              {!hasMobileHero && h.immagine_url && (
                <Image src={h.immagine_url} alt="" fill priority sizes="100vw" style={{ objectFit: 'cover', zIndex: 0 }} />
              )}
              <div className="landing-inner">
                <div className="hero" data-img={h.immagine_url ? '1' : '0'}>
                  {h.titolo && <h1 className="hero-title">{h.titolo}</h1>}
                  {h.testo && <p className="hero-lead">{renderTesto(h.testo)}</p>}
                  <AreaLoginCta variant="hero" />
                </div>
              </div>
            </div>
          )
          return h.link_url
            ? <a href={h.link_url} key={gi} style={{ display: 'block', textDecoration: 'none' }}>{section}</a>
            : section

        } else if (tipo === 'vantaggio') {
          return (
            <div key={gi} className="landing-features">
              <div className="landing-inner">
                <div className="features">
                  {sezs.map((v) => (
                    <div className="feature" key={v.id}>
                      {v.immagine_url && (
                        <div className="feature-img-wrap">
                          <Image className="feature-img" src={v.immagine_url} alt="" fill sizes="(max-width: 720px) 90vw, 360px" />
                        </div>
                      )}
                      {v.titolo && <h3>{v.titolo}</h3>}
                      {v.testo && <p>{renderTesto(v.testo)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )

        } else if (tipo === 'contenuto') {
          return sezs.map((c, ci) => {
            const alt = sfondoSezione[gi][ci] === 'alt'
            return (
            <div key={c.id} className={`landing-blocco${alt ? ' bg-alt' : ''}`}>
              <div className="landing-inner">
                <div className={`blocco ${c.foto_posizione === 'destra' ? 'blocco-rev' : ''}`}>
                  {c.immagine_url && (
                    <div className="blocco-img">
                      <Image src={c.immagine_url} alt="" width={1200} height={800} style={{ width: '100%', height: 'auto' }} sizes="(max-width: 720px) 90vw, 560px" />
                    </div>
                  )}
                  <div className="blocco-testo">
                    {c.titolo && <h2>{c.titolo}</h2>}
                    {c.testo && <p>{renderTesto(c.testo)}</p>}
                  </div>
                </div>
              </div>
            </div>
            )
          })

        } else if (tipo === 'banner') {
          return sezs.map((b) => {
            const altezza = b.altezza_px ?? 300
            // Se c'è immagine mobile usiamo un <picture> con <source media>
            // altrimenti fallback all'immagine desktop su tutti i dispositivi
            const hasMobile = !!b.immagine_mobile_url
            const hasDesktop = !!b.immagine_url

            // Stile di sfondo usato SOLO se non c'è immagine mobile definita (caso semplice)
            const bgStyleDesktop = hasDesktop
              ? {
                  backgroundImage: `url(${b.immagine_url})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#0d2137',
                }
              : { backgroundColor: '#0a5a8a' }

            // Se ha immagine mobile, usiamo <picture> assoluto invece del background-image
            // così possiamo usare media queries native del browser
            const contenuto = (
              <div
                key={b.id}
                className="landing-banner"
                style={{
                  minHeight: altezza,
                  position: 'relative',
                  overflow: 'hidden',
                  ...(hasMobile ? { backgroundColor: '#0d2137' } : bgStyleDesktop),
                }}
              >
                {/* Immagine con media query nativa — solo se c'è almeno una delle due */}
                {(hasMobile || hasDesktop) && (
                  <picture style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {hasMobile && (
                      <source media="(max-width: 768px)" srcSet={b.immagine_mobile_url} />
                    )}
                    {hasDesktop && (
                      <img
                        src={b.immagine_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    )}
                  </picture>
                )}
                {/* Testo sopra l'immagine */}
                {(b.titolo || b.testo) && (
                  <div className="landing-banner-inner" style={{ position: 'relative', zIndex: 1 }}>
                    {b.titolo && <h2>{b.titolo}</h2>}
                    {b.testo && <p>{renderTesto(b.testo)}</p>}
                  </div>
                )}
              </div>
            )
            return b.link_url
              ? <a href={b.link_url} key={b.id} style={{ display: 'block', textDecoration: 'none' }}>{contenuto}</a>
              : contenuto
          })
        } else if (tipo === 'social') {
          const soc = sezs[0]
          return (
            <div key={gi} className="landing-social" id="social">
              <div className="landing-inner">
                <div className="social-box">
                  {soc.immagine_url && (
                    <div className="social-img-wrap">
                      <Image src={soc.immagine_url} alt="" fill sizes="(max-width: 720px) 90vw, 420px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div className="social-testo">
                    {soc.titolo && <h2>{soc.titolo}</h2>}
                    {soc.testo && <p>{renderTesto(soc.testo)}</p>}
                    <div className="social-links">
                      {soc.link_url && (
                        <a href={soc.link_url} target="_blank" rel="noopener noreferrer" className="social-btn social-btn-fb">
                          📘 Seguici su Facebook
                        </a>
                      )}
                      {soc.link_url_2 && (
                        <a href={soc.link_url_2} target="_blank" rel="noopener noreferrer" className="social-btn social-btn-ig">
                          📷 Seguici su Instagram
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )

        } else if (tipo === 'prezzi') {
          const pr = sezs[0]
          return (
            <div key={gi} className="landing-pricing" id="prezzi">
              <div className="landing-inner">
                <h2 className="pricing-title">{pr.titolo || 'Cosa include ogni piano'}</h2>
                <p className="pricing-sub">{pr.testo || 'Le funzionalità di base sono sempre gratuite. Sblocca tutto con un piano, disdici quando vuoi.'}</p>

                <div className="pricing-grid">
                  <div className="pricing-card">
                    <div className="pricing-card-tipo">Gratuito</div>
                    <div className="pricing-card-prezzo">€0</div>
                    <ul className="pricing-feature-list">
                      {funzionalitaGratis.map((l) => <li key={l}><span className="pf-ok">✓</span> {l}</li>)}
                    </ul>
                    <Link href="/registrati" className="btn-hero" style={{ display: 'inline-block', marginTop: 18 }}>Inizia gratis</Link>
                  </div>

                  <div className="pricing-card pricing-card-evidenza">
                    <div className="pricing-card-tipo">Sblocca tutto — per allenatori e staff</div>
                    <div className="pricing-righe">
                      <span className="pr-label">Mensile</span><span className="pr-prezzo">€{prezzi.allenatore.mensile}</span><span className="pr-unita">/mese</span>
                      <span className="pr-label">Annuale</span><span className="pr-prezzo">€{prezzi.allenatore.annuale}</span><span className="pr-unita">/anno</span>
                      <span className="pr-label">A vita</span><span className="pr-prezzo">€{prezzi.allenatore.lifetime}</span><span className="pr-unita">una tantum</span>
                    </div>
                    <ul className="pricing-feature-list">
                      {funzionalitaTutte.map((l) => <li key={l}><span className="pf-ok">✓</span> {l}</li>)}
                    </ul>
                    <Link href="/registrati" className="btn-hero" style={{ display: 'inline-block', marginTop: 18 }}>Inizia gratis</Link>
                  </div>
                </div>

                <p className="pricing-portiere-nota">
                  Per i portieri: statistiche di base sempre gratuite. Per vedere ogni singola funzione nel
                  dettaglio, l&apos;abbonamento costa €{prezzi.portiere.mensile}/mese, €{prezzi.portiere.annuale}/anno oppure €{prezzi.portiere.lifetime} una tantum.
                </p>
              </div>
            </div>
          )

        } else if (tipo === 'faq') {
          return (
            <div key={gi} className="landing-faq" id="faq">
              <div className="landing-inner">
                <h2 className="faq-title">Domande frequenti</h2>
                <div className="faq-list">
                  {sezs.map((f) => (
                    <details key={f.id} className="faq-item">
                      <summary>{f.titolo || 'Domanda'}</summary>
                      <p>{renderTesto(f.testo)}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )

        } else if (tipo === 'testo') {
          return sezs.map((t, ti) => {
            const alt = sfondoSezione[gi][ti] === 'alt'
            return (
            <div key={t.id} className={`landing-testo${alt ? ' bg-alt' : ''}`}>
              <div className="landing-inner">
                <div className="testo-box">
                  {t.titolo && <h2>{t.titolo}</h2>}
                  {t.testo && <p>{renderTesto(t.testo)}</p>}
                </div>
              </div>
            </div>
            )
          })

        }
        return null
      })}

      {/* ── Sezione ricerca allenatori ── */}
      <div className="landing-cerca" id="ricerca-allenatori">
        <div className="landing-inner">
          <CercaAllenatoriBox />
        </div>
      </div>

      <section style={{ padding: '32px 20px', borderTop: '1px solid var(--linea, #e2e6e1)' }}>
        <NewsletterSignup />
      </section>
      {/* ── Footer ── */}
      <footer className="landing-foot">
        GKSeason · Gestione portieri
        <span className="landing-foot-sep">·</span>
        <Link href="/privacy-policy">Privacy Policy</Link>
        <span className="landing-foot-sep">·</span>
        <Link href="/cookie-policy">Cookie Policy</Link>
        <span className="landing-foot-sep">·</span>
        <Link href="/termini-di-servizio">Termini di Servizio</Link>
      </footer>
    </div>
  )
}
