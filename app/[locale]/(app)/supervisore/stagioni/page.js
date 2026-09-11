import { redirect } from 'next/navigation'

// Legacy: le stagioni sono dati personali dell'allenatore, non configurazione
// della piattaforma. La pagina vera e mantenuta e /stagioni ("Le mie stagioni").
export default function StagioniSupervisoreRedirect() {
  redirect('/stagioni')
}
