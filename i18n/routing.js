import { defineRouting } from 'next-intl/routing'
import { createElement } from 'react'
import { createNavigation } from 'next-intl/navigation'

// Lingue ATTIVE. Per aggiungere francese/spagnolo in futuro:
//   1) aggiungi 'fr' / 'es' qui sotto
//   2) crea messages/fr.json / messages/es.json
// Nient'altro: il selettore lingua e la sitemap si estendono da soli.
export const routing = defineRouting({
  locales: ['it', 'en', 'de', 'es'],
  defaultLocale: 'it',
  // 'as-needed' => l'italiano (default) resta SENZA prefisso: tutti gli URL
  // attuali (gkseason.it/dashboard) non cambiano. Solo en/de prendono /en /de.
  localePrefix: 'as-needed',
  // true => alla PRIMA visita la lingua viene scelta cosi':
  //   1) cookie NEXT_LOCALE, se c'e' (= l'utente ha gia' scelto con la bandierina)
  //   2) altrimenti Accept-Language del browser/sistema
  //   3) altrimenti italiano
  // Il cookie ha la precedenza sul sistema, quindi una volta che l'utente
  // cambia lingua quella scelta resta anche se il PC e' impostato diversamente.
  localeDetection: true,
})

// Helper di navigazione "consapevoli della lingua": usali al posto di
// next/link e next/navigation nei componenti che devono restare in lingua.
const nav = createNavigation(routing)
export const { redirect, usePathname, useRouter, getPathname } = nav

// Link con PREFETCH SPENTO di default (ottobre 2026, risparmio CPU Vercel).
// Con il prefetch acceso Next.js esegue sul server, in anticipo, ogni pagina
// dinamica il cui link compare a schermo: 13 voci di menu + ogni allenamento
// in elenco = decine di render (layout con ~15 query ciascuno) per una sola
// pagina aperta, quasi tutti mai usati. Senza prefetch la pagina viene
// generata solo al clic. Dove serve davvero si puo' riattivare con
// <Link prefetch>.
export function Link({ prefetch = false, ...props }) {
  return createElement(nav.Link, { prefetch, ...props })
}
