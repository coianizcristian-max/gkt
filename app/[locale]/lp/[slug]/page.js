import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import LegalFooter from '@/app/components/LegalFooter'
import { LANDING, SLUGS, PASSI } from '@/lib/landingAds'
import './lp.css'

/**
 * Landing degli annunci: gkseason.it/lp/<slug>
 *
 * Una pagina sola, tre contenuti (lib/landingAds.js). Niente menu, niente
 * ricerca allenatori, niente prezzi: chi arriva da un annuncio deve fare una
 * cosa tra due, registrarsi o aprire la demo. Tutto il resto lo distrae.
 *
 * Statica: nessuna lettura dal database, quindi viene pre-generata al build
 * per ogni slug e per ogni lingua (i testi restano in italiano: le campagne
 * sono italiane). Slug sconosciuti -> notFound() -> 404 (volutamente NON
 * dynamicParams=false: con il rewrite della lingua di next-intl quella
 * strada restituisce la pagina 404 con stato 200).
 *
 * Tracciamento: PostHog, Pixel Meta e tag Google arrivano dal layout, come
 * su tutte le pagine; AttribuzioneUtm salva utm/gclid al primo atterraggio,
 * cosi' la registrazione resta attribuita all'annuncio.
 */
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
    openGraph: { title: c.titoloPagina, description: c.descrizione },
  }
}

export default async function LandingAnnunci({ params }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const c = LANDING[slug]
  if (!c) notFound()

  const registrati = { pathname: '/registrati', query: { ruolo: 'allenatore' } }

  return (
    <div className="lp">
      <header className="lp-top">
        <Link href="/" className="lp-brand" prefetch={false}>
          <span className="lp-glove" aria-hidden="true">GK</span>
          <span className="lp-brand-testo"><b>GKSeason</b><small>Gestionale allenamento portieri</small></span>
        </Link>
        <Link href="/login" className="lp-accedi" prefetch={false}>Hai già un account? Accedi</Link>
      </header>

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
          <Pannello tipo={c.pannello} />
        </div>
      </section>

      <section className="lp-sezione">
        <div className="lp-inner">
          <h2>{c.vantaggiTitolo}</h2>
          <div className="lp-vantaggi">
            {c.vantaggi.map((v) => (
              <div className="lp-vantaggio" key={v.titolo}>
                <Icona nome={v.icona} />
                <h3>{v.titolo}</h3>
                <p>{v.testo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sezione lp-sezione-alt">
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

      <section className="lp-sezione">
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

      <section className="lp-sezione lp-sezione-alt">
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

/* ───────────────────────── Pannelli dell'hero ───────────────────────── */

function Pannello({ tipo }) {
  if (tipo === 'settimana') return <PannelloSettimana />
  if (tipo === 'valutazione') return <PannelloValutazione />
  return <PannelloScheda />
}

// Scheda del portiere: voti per parametro e andamento recente.
function PannelloScheda() {
  const parametri = [
    { nome: 'Presa', voto: 7.8 },
    { nome: 'Uscite alte', voto: 6.9 },
    { nome: 'Piedi', voto: 7.1 },
    { nome: '1 contro 1', voto: 7.5 },
  ]
  // Ultimi 8 allenamenti, voti da 6 a 8 (asse y rovesciato nel disegno).
  const voti = [6.5, 7, 6.5, 7, 7.5, 7, 7.5, 8]
  const punti = voti.map((v, i) => `${(i * 220) / 7},${56 - ((v - 6) / 2) * 48}`).join(' ')
  return (
    <div className="lp-pannello" aria-label="Esempio di scheda portiere">
      <div className="lp-pan-testa">
        <div>
          <strong>Marco R.</strong>
          <span className="lp-pan-cat">Under 15</span>
        </div>
        <span className="lp-pan-tag">Scheda portiere</span>
      </div>
      <div className="lp-pan-numeri">
        <div><b>7,3</b><span>media voto</span></div>
        <div><b>24/26</b><span>presenze</span></div>
        <div><b>6</b><span>clean sheet</span></div>
      </div>
      <div className="lp-pan-barre">
        {parametri.map((p) => (
          <div className="lp-pan-barra" key={p.nome}>
            <span>{p.nome}</span>
            <i><b style={{ width: `${(p.voto / 10) * 100}%` }} /></i>
            <em>{String(p.voto).replace('.', ',')}</em>
          </div>
        ))}
      </div>
      <div className="lp-pan-trend">
        <span>Ultimi 8 allenamenti</span>
        <svg viewBox="-4 -4 228 64" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={punti} fill="none" stroke="#0a7ec2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {voti.map((v, i) => (
            <circle key={i} cx={(i * 220) / 7} cy={56 - ((v - 6) / 2) * 48} r="3" fill="#fff" stroke="#0a7ec2" strokeWidth="2" />
          ))}
        </svg>
      </div>
    </div>
  )
}

// Settimana di allenamenti generata dalle ricorrenze.
function PannelloSettimana() {
  const righe = [
    { g: 'Mar', h: '18:00', cat: 'Under 15', cosa: 'Presa e posizionamento', nota: '3 esercizi, 75 min' },
    { g: 'Mer', h: '18:30', cat: 'Under 17', cosa: 'Uscite alte e letture', nota: '4 esercizi, 90 min' },
    { g: 'Gio', h: '18:00', cat: 'Under 15', cosa: 'Piedi e costruzione', nota: '3 esercizi, 75 min' },
    { g: 'Sab', h: '15:00', cat: 'Under 15', cosa: 'Partita di campionato', nota: 'valutazione da fare', partita: true },
  ]
  return (
    <div className="lp-pannello" aria-label="Esempio di settimana di allenamenti">
      <div className="lp-pan-testa">
        <div>
          <strong>Settimana 12</strong>
          <span className="lp-pan-cat">Under 15 e Under 17</span>
        </div>
        <span className="lp-pan-tag">Calendario</span>
      </div>
      <ul className="lp-pan-sedute">
        {righe.map((r) => (
          <li key={r.g + r.cat} className={r.partita ? 'lp-pan-partita' : ''}>
            <span className="lp-pan-giorno"><b>{r.g}</b>{r.h}</span>
            <span className="lp-pan-seduta"><b>{r.cosa}</b><small>{r.cat}</small></span>
            <span className="lp-pan-nota">{r.nota}</span>
          </li>
        ))}
      </ul>
      <p className="lp-pan-piede">Generata dalle ricorrenze: due allenamenti a settimana per categoria, per tutta la stagione.</p>
    </div>
  )
}

// Valutazione di una seduta, portiere per portiere.
function PannelloValutazione() {
  const righe = [
    { nome: 'Marco R.', voto: '7,5', stato: 'presente', nota: 'Buone uscite, piedi da migliorare' },
    { nome: 'Luca B.', voto: '6,5', stato: 'presente', nota: 'Timido sul primo palo' },
    { nome: 'Davide T.', voto: null, stato: 'assente', nota: 'Rientro previsto martedì' },
  ]
  return (
    <div className="lp-pannello" aria-label="Esempio di valutazione di una seduta">
      <div className="lp-pan-testa">
        <div>
          <strong>Allenamento di martedì</strong>
          <span className="lp-pan-cat">Under 15, presa e posizionamento</span>
        </div>
        <span className="lp-pan-tag">Valutazione</span>
      </div>
      <ul className="lp-pan-voti">
        {righe.map((r) => (
          <li key={r.nome}>
            <span className={`lp-pan-voto${r.voto ? '' : ' lp-pan-voto-vuoto'}`}>{r.voto ?? '–'}</span>
            <span className="lp-pan-chi"><b>{r.nome}</b><small>{r.stato}</small></span>
            <span className="lp-pan-nota">{r.nota}</span>
          </li>
        ))}
      </ul>
      <div className="lp-pan-numeri">
        <div><b>7,0</b><span>media seduta</span></div>
        <div><b>7,1</b><span>media stagione</span></div>
        <div><b>+0,3</b><span>sul mese scorso</span></div>
      </div>
    </div>
  )
}

/* ───────────────────────────── Icone ───────────────────────────── */

function Icona({ nome }) {
  const comuni = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (nome) {
    case 'calendario':
      return <svg {...comuni} className="lp-icona"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 14h3M13 14h3M8 18h3" /></svg>
    case 'voto':
      return <svg {...comuni} className="lp-icona"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>
    case 'grafico':
      return <svg {...comuni} className="lp-icona"><path d="M4 19V5M4 19h16" /><path d="M7 15l4-5 3 3 5-6" /></svg>
    case 'esercizi':
      return <svg {...comuni} className="lp-icona"><path d="M9 20h6l-2-14h-2L9 20z" /><path d="M7 20h10" /><path d="M10 10h4" /></svg>
    case 'template':
      return <svg {...comuni} className="lp-icona"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
    case 'report':
      return <svg {...comuni} className="lp-icona"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 16h6" /></svg>
    default:
      return null
  }
}
