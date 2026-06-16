import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const [{ data: sezioni }, { data: { user } }, { data: stagione }] = await Promise.all([
    supabase.from('sito_sezioni').select('*').eq('visibile', true).order('ordine'),
    supabase.auth.getUser(),
    supabase.from('stagioni').select('societa_nome, logo_url').eq('attiva', true).maybeSingle(),
  ])

  const lista = sezioni ?? []
  const hero = lista.find((s) => s.tipo === 'hero')
  const vantaggi = lista.filter((s) => s.tipo === 'vantaggio')
  const contenuti = lista.filter((s) => s.tipo === 'contenuto')
  const loggedIn = !!user
  const societa = stagione?.societa_nome ?? 'Azzurra Sandrigo'

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand">
          {stagione?.logo_url
            ? <img className="brand-logo" src={stagione.logo_url} alt="" />
            : <div className="glove">GK</div>}
          <div>
            <b>GKT</b>
            <span>{societa}</span>
          </div>
        </div>
        <nav className="landing-nav">
          {loggedIn
            ? <Link href="/portieri" className="link-accedi">La mia area</Link>
            : <Link href="/login" className="link-accedi">Accedi</Link>}
        </nav>
      </header>

      {hero && (
        <section className="hero" style={hero.immagine_url ? { backgroundImage: `linear-gradient(rgba(8,18,28,.55),rgba(8,18,28,.55)), url(${hero.immagine_url})` } : undefined} data-img={hero.immagine_url ? '1' : '0'}>
          <p className="hero-eyebrow">Gestione portieri</p>
          {hero.titolo && <h1 className="hero-title">{hero.titolo}</h1>}
          {hero.testo && <p className="hero-lead">{hero.testo}</p>}
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
      )}

      {vantaggi.length > 0 && (
        <section className="features">
          {vantaggi.map((v) => (
            <div className="feature" key={v.id}>
              {v.immagine_url && <img className="feature-img" src={v.immagine_url} alt="" />}
              {v.titolo && <h3>{v.titolo}</h3>}
              {v.testo && <p>{v.testo}</p>}
            </div>
          ))}
        </section>
      )}

      {contenuti.map((c, idx) => (
        <section className={`blocco ${idx % 2 ? 'blocco-rev' : ''}`} key={c.id}>
          {c.immagine_url && <div className="blocco-img"><img src={c.immagine_url} alt="" /></div>}
          <div className="blocco-testo">
            {c.titolo && <h2>{c.titolo}</h2>}
            {c.testo && <p>{c.testo}</p>}
          </div>
        </section>
      ))}

      <footer className="landing-foot">
        GKT · {societa}
      </footer>
    </div>
  )
}
