// Icona della tipologia di partita, mostrata nell'angolo della cella di calendario.
// SVG inline nello stile di NavIcon: nessuna dipendenza, colore ereditato.
const PERCORSI = {
  // classifica: campionato
  campionato: 'M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11',
  // coppa
  coppa: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M10 17h4M9 20h6',
  // tabellone a eliminazione: torneo
  torneo: 'M4 5h4v5h4V5h4M4 19h4v-5h4v5h4M18 5v14',
  // stretta di mano: amichevole
  amichevole: 'M7 11l3-3 3 2 4-4M3 12l4 4 3-1 3 2 4-3 4 2',
}

export default function IconaTipoPartita({ tipo, size = 11, className = '', title = null }) {
  const d = PERCORSI[tipo] ?? PERCORSI.campionato
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined} focusable="false">
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  )
}
