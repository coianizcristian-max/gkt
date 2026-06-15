import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const loggedIn = !!user

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKT</b>
            <span>Azzurra Sandrigo</span>
          </div>
        </div>
        <nav>
          {loggedIn ? (
            <Link href="/portieri" className="link-accedi">La mia area</Link>
          ) : (
            <Link href="/login" className="link-accedi">Accedi</Link>
          )}
        </nav>
      </header>

      <section className="hero">
        <p className="hero-eyebrow">Gestione portieri · Scuola calcio</p>
        <h1 className="hero-title">
          Allenamenti, valutazioni e statistiche<br />dei tuoi portieri, in un posto solo.
        </h1>
        <p className="hero-lead">
          GKT raccoglie presenze, voti e partite categoria per categoria, e le
          trasforma in statistiche chiare da consegnare ogni mese a ogni portiere.
        </p>

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

      <section className="features">
        <div className="feature">
          <h3>Calendario allenamenti</h3>
          <p>Programma ogni seduta con obiettivi e consuntivo, segna le presenze categoria per categoria.</p>
        </div>
        <div className="feature">
          <h3>Valutazioni dettagliate</h3>
          <p>Voto, note e punteggi per parametro: tecnica, gioco coi piedi, uscite, posizionamento e altro.</p>
        </div>
        <div className="feature">
          <h3>Statistiche e report</h3>
          <p>Medie, presenze e andamento nel tempo, pronti da condividere con ogni portiere ogni mese.</p>
        </div>
      </section>

      <footer className="landing-foot">
        GKT · Azzurra Sandrigo
      </footer>
    </div>
  )
}
