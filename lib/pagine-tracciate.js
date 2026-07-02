// Mappa URL → nome leggibile, usata per il tracciamento analytics.
// Normalizza i segmenti dinamici (es. /portieri/abc123 -> /portieri/[id])
// così PostHog raggruppa correttamente invece di creare una voce diversa
// per ogni singolo portiere/allenamento/partita.

const PAGINE = [
  // ── Pubblico ──────────────────────────────────────────────────────────
  { match: /^\/$/, nome: 'Home pubblica', area: 'pubblico' },
  { match: /^\/login\/?$/, nome: 'Login', area: 'pubblico' },
  { match: /^\/registrati\/?$/, nome: 'Registrazione (da invito)', area: 'pubblico' },
  { match: /^\/cerca-allenatori\/?$/, nome: 'Ricerca allenatori', area: 'pubblico' },
  { match: /^\/allenatori\/[^/]+\/contatto\/?$/, nome: 'Contatto allenatore (a pagamento)', area: 'pubblico' },
  { match: /^\/allenatori\/[^/]+\/?$/, nome: 'Profilo pubblico allenatore', area: 'pubblico' },
  { match: /^\/newsletter\/?$/, nome: 'Newsletter pubblica', area: 'pubblico' },
  { match: /^\/suggerimenti\/?$/, nome: 'Suggerimenti (form pubblico)', area: 'pubblico' },
  { match: /^\/come-iniziare\/?$/, nome: 'Come iniziare', area: 'pubblico' },

  // ── Onboarding / primo accesso ───────────────────────────────────────
  { match: /^\/dashboard\/?$/, nome: 'Dashboard', area: 'riservato' },

  // ── Portieri ──────────────────────────────────────────────────────────
  { match: /^\/portieri\/nuovo\/?$/, nome: 'Nuovo portiere (form)', area: 'riservato' },
  { match: /^\/portieri\/[^/]+\/obiettivi\/?$/, nome: 'Obiettivi portiere', area: 'riservato' },
  { match: /^\/portieri\/[^/]+\/percorso\/?$/, nome: 'Percorso di crescita portiere', area: 'riservato' },
  { match: /^\/portieri\/[^/]+\/statistiche\/?$/, nome: 'Statistiche portiere', area: 'riservato' },
  { match: /^\/portieri\/[^/]+\/?$/, nome: 'Scheda portiere', area: 'riservato' },
  { match: /^\/portieri\/?$/, nome: 'Elenco portieri', area: 'riservato' },

  // ── Calendario / Allenamenti ─────────────────────────────────────────
  { match: /^\/calendario\/nuovo\/?$/, nome: 'Nuovo allenamento (form)', area: 'riservato' },
  { match: /^\/calendario\/[^/]+\/?$/, nome: 'Dettaglio allenamento', area: 'riservato' },
  { match: /^\/calendario\/?$/, nome: 'Calendario allenamenti', area: 'riservato' },
  { match: /^\/ricorrenze\/?$/, nome: 'Ricorrenze stagionali', area: 'riservato' },

  // ── Partite ───────────────────────────────────────────────────────────
  { match: /^\/partite\/nuova\/?$/, nome: 'Nuova partita (form)', area: 'riservato' },
  { match: /^\/partite\/[^/]+\/?$/, nome: 'Dettaglio partita', area: 'riservato' },
  { match: /^\/partite\/?$/, nome: 'Elenco partite', area: 'riservato' },

  // ── Statistiche / Archivio ───────────────────────────────────────────
  { match: /^\/statistiche\/?$/, nome: 'Statistiche generali', area: 'riservato' },
  { match: /^\/archivio\/?$/, nome: 'Archivio stagioni', area: 'riservato' },

  // ── Esercizi / Profilo / Inviti ──────────────────────────────────────
  { match: /^\/esercizi\/?$/, nome: 'Libreria esercizi', area: 'riservato' },
  { match: /^\/profilo\/?$/, nome: 'Profilo allenatore', area: 'riservato' },
  { match: /^\/inviti\/?$/, nome: 'Inviti', area: 'riservato' },
  { match: /^\/abbonati\/?$/, nome: 'Abbonati / sblocca funzionalità', area: 'riservato' },
  { match: /^\/parametri-valutazione\/?$/, nome: 'Parametri di valutazione personalizzati', area: 'riservato' },

  // ── Supervisore ───────────────────────────────────────────────────────
  { match: /^\/stagioni\/nuova\/?$/, nome: 'Nuova stagione (form)', area: 'riservato' },
  { match: /^\/stagioni\/?$/, nome: 'Le mie stagioni', area: 'riservato' },
  { match: /^\/supervisore\/stagioni\/?$/, nome: 'Stagioni (redirect legacy)', area: 'riservato' },
  { match: /^\/categorie\/?$/, nome: 'Le mie categorie', area: 'riservato' },
  { match: /^\/supervisore\/categorie\/?$/, nome: 'Categorie (redirect legacy)', area: 'riservato' },
  { match: /^\/supervisore\/attributi\/?$/, nome: 'Supervisore: Attributi', area: 'supervisore' },
  { match: /^\/supervisore\/elenchi\/?$/, nome: 'Supervisore: Elenchi', area: 'supervisore' },
  { match: /^\/supervisore\/funzionalita\/?$/, nome: 'Supervisore: Funzionalità (paywall)', area: 'supervisore' },
  { match: /^\/supervisore\/abbonamenti\/?$/, nome: 'Supervisore: Abbonamenti', area: 'supervisore' },
  { match: /^\/supervisore\/coupon\/?$/, nome: 'Supervisore: Coupon', area: 'supervisore' },
  { match: /^\/supervisore\/newsletter\/?$/, nome: 'Supervisore: Newsletter', area: 'supervisore' },
  { match: /^\/supervisore\/?$/, nome: 'Supervisore: Home / Sito', area: 'supervisore' },
]

export function nomePagina(pathname) {
  for (const p of PAGINE) {
    if (p.match.test(pathname)) return { nome: p.nome, area: p.area }
  }
  return { nome: pathname, area: 'altro' }
}
