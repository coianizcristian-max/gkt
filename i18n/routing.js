import { defineRouting } from 'next-intl/routing'
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
  // false => la "/" resta sempre italiana, niente redirect automatico in base
  // alla lingua del browser. Il cambio lingua e' manuale (bandierina).
  // Quando vorrai l'auto-detect, metti true.
  localeDetection: false,
})

// Helper di navigazione "consapevoli della lingua": usali al posto di
// next/link e next/navigation nei componenti che devono restare in lingua.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
