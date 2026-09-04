import { redirect } from 'next/navigation'

// La pagina "Funzionalità" è stata unita a "Abbonamenti" (tab interne).
// Manteniamo la vecchia URL come redirect per i bookmark esistenti.
export default function FunzionalitaRedirect() {
  redirect('/supervisore/abbonamenti')
}
