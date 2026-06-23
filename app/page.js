import Link from 'next/link'
import CercaAllenatoriBox from '@/app/components/CercaAllenatoriBox'
import { createClient } from '@/lib/supabase/server'
import { renderTesto } from '@/lib/renderTesto'

export const dynamic = 'force-dynamic'

// Raggruppa sezioni consecutive dello stesso tipo in blocchi,
// rispettando sempre l'ordine numerico impostato dal supervisore.
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
      <header className="landing-top">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKT</b>
            <span>Gestione portieri</span>
          </div>
        </div>
        <nav className="landing-nav">
          {loggedIn
            ? <Link href="/portieri" className="link-accedi">La mia area</Link>
            : <Link href="/login" className="link-accedi">Accedi</Link>}
        </nav>
      </header>

      {gruppi.map((gruppo, gi) => {
        const { tipo, sezioni: sezs } = gruppo

        // ── HERO ──────────────────────────────────────────────────────
        if (tipo === 'hero') {
          const h = sezs[0] // prende il primo se ce ne sono più di uno
          const inner = (
            <section className="hero" key={h.id}
              style={h.immagine_url ? { backgroundImage: `linear-gradient(rgba(8,18,28,.55),rgba(8,18,28,.55)), url(${h.immagine_url})` } : undefined}
              data-img={h.immagine_url ? '1' : '0'}>
              <p className="hero-eyebrow">Gestione portieri</p>
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
            </section>
          )
          return h.link_url
            ? <a href={h.link_url} key={gi} style={{ display: 'block', textDecoration: 'none' }}>{inner}</a>
            : inner

        // ── VANTAGGI (gruppo di riquadri affiancati) ─────────────────
        } else if (tipo === 'vantaggio') {
          return (
            <section className="features" key={gi}>
              {sezs.map((v) => (
                <div className="feature" key={v.id}>
                  {v.immagine_url && <img className="feature-img" src={v.immagine_url} alt="" />}
                  {v.titolo && <h3>{v.titolo}</h3>}
                  {v.testo && <p>{renderTesto(v.testo)}</p>}
                </div>
              ))}
            </section>
          )

        // ── CONTENUTO (testo + foto, alternabile) ────────────────────
        } else if (tipo === 'contenuto') {
          return sezs.map((c) => (
            <section className={`blocco ${c.foto_posizione === 'destra' ? 'blocco-rev' : ''}`} key={c.id}>
              {c.immagine_url && <div className="blocco-img"><img src={c.immagine_url} alt="" /></div>}
              <div className="blocco-testo">
                {c.titolo && <h2>{c.titolo}</h2>}
                {c.testo && <p>{renderTesto(c.testo)}</p>}
              </div>
            </section>
          ))

        // ── BANNER (fascia orizzontale, eventualmente cliccabile) ────
        } else if (tipo === 'banner') {
          return sezs.map((b) => {
            const altezza = b.altezza_px ?? 300
            const style = {
              width: '100%',
              height: altezza + 'px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              textAlign: 'center',
              background: b.immagine_url
                ? `linear-gradient(rgba(8,18,28,.45),rgba(8,18,28,.45)), url(${b.immagine_url}) center/cover no-repeat`
                : 'var(--azzurro)',
              color: '#fff',
              padding: '0 5%',
            }
            const contenuto = (
              <div key={b.id} style={style}>
                {b.titolo && <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 10px', color: '#fff' }}>{b.titolo}</h2>}
                {b.testo && <p style={{ fontSize: 17, opacity: 0.92, maxWidth: 680, margin: 0 }}>{renderTesto(b.testo)}</p>}
              </div>
            )
            return b.link_url
              ? <a href={b.link_url} key={b.id} style={{ display: 'block', textDecoration: 'none' }}>{contenuto}</a>
              : contenuto
          })
        }

        return null
      })}

      <CercaAllenatoriBox />

      <footer className="landing-foot">
        GKT · Gestione portieri
        <span className="landing-foot-sep">·</span>
        <a href="/privacy-policy">Privacy Policy</a>
        <span className="landing-foot-sep">·</span>
        <a href="/cookie-policy">Cookie Policy</a>
        <span className="landing-foot-sep">·</span>
        <a href="/termini-di-servizio">Termini di Servizio</a>
      </footer>
    </div>
  )
}
