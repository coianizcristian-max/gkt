// Icona SVG per le voci della sidebar. Server component (solo markup).
// La chiave e' il primo segmento dell'href (es. /portieri/123 -> "portieri").

const PATHS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  portieri: 'M12 12a5 5 0 100-10 5 5 0 000 10zM3 21a9 9 0 0118 0z',
  calendario: 'M7 2v3M17 2v3M3 8h18M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  ricorrenze: 'M17 2l4 4-4 4M3 12V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 01-3 3H3',
  partite: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 7l4.7 3.4-1.8 5.5H9.1L7.3 10.4z',
  statistiche: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  esercizi: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 11.5a.5.5 0 100 1 .5.5 0 000-1z',
  'template-allenamenti': 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  profilo: 'M3 5h18v14H3zM7 9h4M7 13h10M7 16h6',
  stagioni: 'M7 2v3M17 2v3M3 8h18M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  categorie: 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01',
  'parametri-valutazione': 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  inviti: 'M3 5h18v14H3zM3 6l9 7 9-7',
  'i-miei-preparatori': 'M3 12a5 5 0 005 5h6l4 3v-8a5 5 0 00-5-5H8a5 5 0 00-5 5zM7 12h.01',
  contatti: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  'come-iniziare': 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM19 3v16',
  faq: 'M12 2a10 10 0 100 20 10 10 0 000-20zM9.5 9a2.5 2.5 0 013.5-1.8c1.2.6 1.5 2 .7 3-.6.7-1.7 1-1.7 2M12 17h.01',
  archivio: 'M3 4h18v4H3zM5 8v12h14V8M9 12h6',
  suggerimenti: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10c1 1 1.5 2 1.5 3h5c0-1 .5-2 1.5-3A6 6 0 0012 3z',
  newsletter: 'M3 5h18v14H3zM3 6l9 7 9-7',
  account: 'M12 12a5 5 0 100-10 5 5 0 000 10zM3 21a9 9 0 0118 0z',
  supervisore: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z',
  abbonati: 'M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.8L12 17l-6.3 3.5 1.6-6.8L2 9.1l7-.6z',
}
const FALLBACK = 'M12 5v14M5 12h14'

export default function NavIcon({ href = '' }) {
  const key = String(href).split('/')[1] || ''
  const d = PATHS[key] || FALLBACK
  return (
    <svg className="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
