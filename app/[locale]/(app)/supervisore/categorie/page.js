import { redirect } from 'next/navigation'

// Spostata fuori dal pannello di amministrazione globale: le categorie sono
// dati personali dell'allenatore, non configurazione dell'intera piattaforma.
// Redirect mantenuto per eventuali link/segnalibri salvati.
export default function CategorieSupervisoreRedirect() {
  redirect('/categorie')
}
