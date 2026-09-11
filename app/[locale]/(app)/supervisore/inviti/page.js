import { redirect } from 'next/navigation'

// Legacy: gli inviti sono dati personali dell'allenatore, non configurazione
// della piattaforma. La pagina vera e mantenuta e /inviti.
export default function InvitiSupervisoreRedirect() {
  redirect('/inviti')
}
