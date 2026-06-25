import Link from 'next/link'
import CercaAllenatoriBox from '@/app/components/CercaAllenatoriBox'
import { createClient } from '@/lib/supabase/server'
import { renderTesto } from '@/lib/renderTesto'

export const dynamic = 'force-dynamic'

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
  const supabase = await createClient()
  const [{ data: sezioni }, { data: { user } }] = await Promise.all([
    supabase.from('sito_sezioni').select('*').eq('visibile', true).order('ordine'),
    supabase.auth.getUser(),
  ])

  const lista = sezioni ?? []
  const loggedIn = !!user
  const gruppi = gruppaPerTipo(lista)

  return (
    <div className="landing">

      {/* ── Navbar fissa ── */}
      <header className="landing-top">
        <div className="brand">
          <div className="glove" style={{ width: 32, height: 32, fontSize: 13 }}>GK</div>
          <div>
            <b>GKT</b>
            <span>Gestione portieri</span>
          </div>
        </div>
        <nav>
          {loggedIn
            ? <Link href="/portieri" className="link-accedi">La mia area</Link>
            : <Link href="/login" className="link-accedi">Accedi</Link>}
        </nav>
      </header>

      {/* ── Sezioni dal DB in ordine ── */}
      {gruppi.map((gruppo, gi) => {
        // Salta sezioni senza contenuto reale (titolo di default e nessun testo/immagine)
        const sezsFiltrate = gruppo.sezioni.filter(s =>
          s.immagine_url || s.testo || (s.titolo && s.titolo !== 'Nuova sezione')
        )
        if (sezsFiltrate.length === 0) return null
        const gruppoFiltrato = { ...gruppo, sezioni: sezsFiltrate }
        const { tipo, sezioni: sezs } = gruppoFiltrato

        if (tipo === 'hero') {
          const h = sezs[0]
          // Se c'è immagine mobile usa position:relative + <picture>, altrimenti background-image
          const hasMobileHero = !!h.immagine_mobile_url
          const bgStyle = h.immagine_url && !hasMobileHero
            ? { backgroundImage: `url(${h.immagine_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {}
          const section = (
            <div key={gi} className="landing-hero" data-hasimg={h.immagine_url ? '1' : '0'} style={{ position: 'relative', overflow: 'hidden', ...bgStyle }}>
              {hasMobileHero && (
                <picture style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                  <source media="(max-width: 768px)" srcSet={h.immagine_mobile_url} />
                  <img src={h.immagine_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </picture>
              )}
              <div className="landing-inner">
                <div className="hero" data-img={h.immagine_url ? '1' : '0'}>
                  {h.titolo && <h1 className="hero-title">{h.titolo}</h1>}
                  {h.testo && <p className="hero-lead">{renderTesto(h.testo)}</p>}
                  {loggedIn ? (
                    <Link href="/portieri" className="cta-card">
                      <span className="cta-text">
                        <span className="cta-eyebrow">Area gestione</span>
                        <strong>Entra nella tua area operativa</strong>
                        <span className="cta-sub">Portieri · Calendario · Partite · Statistiche</span>
                      </span>
                      <span className="cta-arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                  ) : (
                    <div className="cta-guest">
                      <Link href="/login" className="btn-hero">Accedi all&apos;area gestione</Link>
                      <span className="cta-guest-note">Riservata allo staff tecnico e ai portieri.</span>
                    </div>
                  )}
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
                      {v.immagine_url && <img className="feature-img" src={v.immagine_url} alt="" />}
                      {v.titolo && <h3>{v.titolo}</h3>}
                      {v.testo && <p>{renderTesto(v.testo)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )

        } else if (tipo === 'contenuto') {
          return sezs.map((c, ci) => (
            <div key={c.id} className={`landing-blocco${ci % 2 === 1 ? ' bg-alt' : ''}`}>
              <div className="landing-inner">
                <div className={`blocco ${c.foto_posizione === 'destra' ? 'blocco-rev' : ''}`}>
                  {c.immagine_url && <div className="blocco-img"><img src={c.immagine_url} alt="" /></div>}
                  <div className="blocco-testo">
                    {c.titolo && <h2>{c.titolo}</h2>}
                    {c.testo && <p>{renderTesto(c.testo)}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))

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
        }
        return null
      })}

      {/* ── Sezione ricerca allenatori ── */}
      <div className="landing-cerca">
        <div className="landing-inner">
          <CercaAllenatoriBox />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-foot">
        GKT · Gestione portieri
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
