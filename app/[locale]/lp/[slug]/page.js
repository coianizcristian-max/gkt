import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { Link } from '@/i18n/routing'
import LegalFooter from '@/app/components/LegalFooter'
import { LANDING, SLUGS, PASSI, PRIMA_DOPO, PER_CHI, TOUR, SCHERMATE } from '@/lib/landingAds'
import './lp.css'

/**
 * Landing degli annunci: gkseason.it/lp/<slug>
 *
 * Una pagina sola, tre contenuti (lib/landingAds.js). Niente menu, niente
 * ricerca allenatori: chi arriva da un annuncio deve fare una cosa tra due,
 * registrarsi o aprire la demo. Tutto il resto lo distrae.
 *
 * Le immagini sono screenshot veri dell'app presi dalla stagione demo da
 * telefono (public/lp/*.webp). I prezzi vengono dal database come in home
 * (funzionalita_config), con gli stessi valori di riserva; la pagina viene
 * rigenerata al massimo ogni ora.
 *
 * Slug sconosciuti -> notFound() -> 404 (volutamente NON dynamicParams=false:
 * con il rewrite della lingua di next-intl quella strada restituisce la
 * pagina 404 con stato 200).
 *
 * Tracciamento: PostHog, Pixel Meta e tag Google arrivano dal layout, come
 * su tutte le pagine; AttribuzioneUtm salva utm/gclid al primo atterraggio,
 * cosi' la registrazione resta attribuita all'annuncio.
 */
export const revalidate = 3600

const DEFAULT_PREZZI = { mensile: '9.90', annuale: '79.00', lifetime: '199.00' }

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const c = LANDING[slug]
  if (!c) return {}
  return {
    title: c.titoloPagina,
    description: c.descrizione,
    // Pagina a pagamento: non deve comparire nei risultati organici al posto
    // della home. AdsBot la legge comunque per il punteggio di qualita'.
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: { title: c.titoloPagina, description: c.descrizione, images: [{ url: SCHERMATE[c.heroSchermata].src }] },
  }
}

async function leggiPrezzi() {
  const prezzi = { ...DEFAULT_PREZZI }
  try {
    const supabase = createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data } = await supabase.from('funzionalita_config').select('chiave, label').like('chiave', 'prezzo_allenatore_%')
    for (const r of (data ?? [])) {
      const m = r.chiave.match(/^prezzo_allenatore_(mensile|annuale|lifetime)$/)
      if (m && r.label) prezzi[m[1]] = r.label
    }
  } catch {}
  return prezzi
}

const euro = (v) => String(v).replace('.', ',')

export default async function LandingAnnunci({ params }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const c = LANDING[slug]
  if (!c) notFound()
  const prezzi = await leggiPrezzi()

  const registrati = { pathname: '/registrati', query: { ruolo: 'allenatore' } }
  const hero = SCHERMATE[c.heroSchermata]
  const hero2 = SCHERMATE[c.heroSchermata2]

  return (
    <div className="lp">
      <header className="lp-top">
        <Link href="/" className="lp-brand" prefetch={false}>
          <span className="lp-glove" aria-hidden="true">GK</span>
          <span className="lp-brand-testo"><b>GKSeason</b><small>Gestionale allenamento portieri</small></span>
        </Link>
        <Link href="/login" className="lp-accedi" prefetch={false}>Hai già un account? Accedi</Link>
      </header>

      {/* ── Hero: testo + due telefoni con schermate vere ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-testo">
            <p className="lp-sopra">{c.sopratitolo}</p>
            <h1>{c.titolo}</h1>
            <p className="lp-lead">{c.lead}</p>
            <div className="lp-cta">
              <Link href={registrati} className="lp-btn lp-btn-pieno">Crea l&apos;account gratis</Link>
              <a href="/d" className="lp-btn lp-btn-vuoto">Apri la demo senza registrarti</a>
            </div>
            <ul className="lp-garanzie">
              <li>Senza carta di credito</li>
              <li>Da telefono e da PC</li>
              <li>Fatto da un preparatore dei portieri</li>
            </ul>
          </div>
          <div className="lp-hero-telefoni" aria-hidden="true">
            <Telefono img={hero2} classe="lp-tel-dietro" />
            <Telefono img={hero} classe="lp-tel-davanti" priorita />
          </div>
        </div>
      </section>

      {/* ── Tour dentro l'app ── */}
      <section className="lp-sezione lp-tour">
        <div className="lp-inner">
          <h2>Dentro GKSeason</h2>
          <p className="lp-sotto">Schermate vere, prese dalla stagione demo che puoi aprire senza registrarti.</p>
          {c.tour.map((chiave, i) => {
            const t = TOUR[chiave]
            const img = SCHERMATE[t.schermata]
            return (
              <div className={`lp-tappa${i % 2 ? ' lp-tappa-inv' : ''}`} key={chiave}>
                <div className="lp-tappa-img"><Telefono img={img} /></div>
                <div className="lp-tappa-testo">
                  <h3>{t.titolo}</h3>
                  <p>{t.testo}</p>
                  <ul className="lp-punti">
                    {t.punti.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Prima / dopo ── */}
      <section className="lp-sezione lp-sezione-alt">
        <div className="lp-inner">
          <h2>Oggi, e con GKSeason</h2>
          <div className="lp-confronto" role="table">
            <div className="lp-confronto-testa" role="row">
              <span role="columnheader">Come va di solito</span>
              <span role="columnheader">Con GKSeason</span>
            </div>
            {PRIMA_DOPO.map((r) => (
              <div className="lp-confronto-riga" role="row" key={r.prima}>
                <span className="lp-prima" role="cell">{r.prima}</span>
                <span className="lp-dopo" role="cell">{r.dopo}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Come funziona ── */}
      <section className="lp-sezione">
        <div className="lp-inner">
          <h2>Come funziona</h2>
          <ol className="lp-passi">
            {PASSI.map((p, i) => (
              <li key={p.titolo}>
                <span className="lp-passo-n" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{p.titolo}</h3>
                  <p>{p.testo}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Per chi e' ── */}
      <section className="lp-sezione lp-sezione-alt">
        <div className="lp-inner">
          <h2>Per chi allena portieri, a qualsiasi livello</h2>
          <div className="lp-perchi">
            {PER_CHI.map((p) => (
              <div className="lp-perchi-voce" key={p.titolo}>
                <h3>{p.titolo}</h3>
                <p>{p.testo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prezzi ── */}
      <section className="lp-sezione">
        <div className="lp-inner lp-prezzi">
          <h2>Quanto costa</h2>
          <div className="lp-prezzi-griglia">
            <div className="lp-prezzo">
              <span className="lp-prezzo-nome">Base</span>
              <span className="lp-prezzo-cifra">0 €</span>
              <span className="lp-prezzo-nota">per sempre</span>
              <p>Calendario, allenamenti, valutazioni, libreria esercizi, inviti ai portieri, export dei dati.</p>
            </div>
            <div className="lp-prezzo lp-prezzo-pieno">
              <span className="lp-prezzo-nome">Completo</span>
              <span className="lp-prezzo-cifra">{euro(prezzi.mensile)} €<small>/mese</small></span>
              <span className="lp-prezzo-nota">oppure {euro(prezzi.annuale)} € l&apos;anno, o {euro(prezzi.lifetime)} € una volta per sempre</span>
              <p>Tutto il base più obiettivi, statistiche di dettaglio, percorso di crescita, ricorrenze automatiche, report PDF completi.</p>
            </div>
          </div>
          <p className="lp-prezzi-piede">Si parte sempre dal base, gratis. Le funzioni complete le provi per un periodo senza pagare e decidi dopo.</p>
        </div>
      </section>

      {/* ── Chi l'ha fatto ── */}
      <section className="lp-sezione lp-sezione-alt">
        <div className="lp-inner lp-autore">
          <h2>Chi l&apos;ha fatto</h2>
          <p>
            GKSeason l&apos;ha costruito un preparatore dei portieri che allena ogni settimana e che per anni
            ha tenuto voti e presenze tra fogli Excel, foto di appunti e chat di squadra. Non è un gestionale
            per il calcio adattato ai portieri: è nato per i portieri, con i parametri, le sedute e le statistiche
            che servono a chi fa questo lavoro.
          </p>
          <p className="lp-firma">Cristian Coianiz, preparatore dei portieri e autore di GKSeason</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-sezione">
        <div className="lp-inner lp-faq">
          <h2>Domande frequenti</h2>
          {c.faq.map((f) => (
            <details className="lp-faq-voce" key={f.d}>
              <summary>{f.d}</summary>
              <p>{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Chiusura ── */}
      <section className="lp-finale">
        <div className="lp-inner">
          <h2>Prova con i tuoi portieri</h2>
          <p>Crea l&apos;account, inserisci una categoria e valuta la prossima seduta. Se non fa per te, non hai perso niente.</p>
          <div className="lp-cta">
            <Link href={registrati} className="lp-btn lp-btn-pieno">Crea l&apos;account gratis</Link>
            <a href="/d" className="lp-btn lp-btn-vuoto">Apri la demo senza registrarti</a>
          </div>
        </div>
      </section>

      <LegalFooter />
    </div>
  )
}

/** Cornice telefono disegnata in CSS attorno a uno screenshot 750x1300. */
function Telefono({ img, classe = '', priorita = false }) {
  return (
    <div className={`lp-tel ${classe}`.trim()}>
      <div className="lp-tel-schermo">
        <img
          src={img.src}
          alt={img.alt}
          width={750}
          height={1300}
          loading={priorita ? 'eager' : 'lazy'}
          fetchPriority={priorita ? 'high' : 'auto'}
          decoding="async"
        />
      </div>
    </div>
  )
}
