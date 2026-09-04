import { createClient as createAdmin } from '@supabase/supabase-js'
import { getGiorniProva } from './gating'

// ────────────────────────────────────────────────────────────────────────────
// Prova gratuita "una sola volta alla prima iscrizione".
//
// Alla prima entrata di un allenatore o di un portiere creiamo UNA riga
// `abbonamenti` con stato 'prova' e scadenza = oggi + giorni_prova_{ruolo}
// (parametro dal Supervisore). `hasAbbonamento` riconosce già lo stato 'prova'.
//
// Il flag `profili.prova_creata` garantisce che avvenga UNA VOLTA SOLA: una
// volta true non si riattiva mai più, nemmeno dopo scadenza o cancellazione.
//
// Usiamo il client ADMIN (service_role, solo server) per l'insert su
// `abbonamenti`, così non dipendiamo dalle policy RLS di quella tabella.
// Il flag su `profili` lo scrive lo stesso client admin per coerenza.
//
// Ritorna { creata, giorni, scadenza } (creata=true solo la prima volta).
// Non lancia: in caso di errore l'utente entra comunque (accesso non bloccato).
// ────────────────────────────────────────────────────────────────────────────
export async function assicuraProva(supabaseUtente, user, profilo) {
  const ruolo = profilo?.ruolo
  // Prova solo per chi ha un piano proprio: allenatore titolare e portiere.
  // Lo staff eredita il coach, quindi niente prova propria.
  if (!user || (ruolo !== 'allenatore' && ruolo !== 'portiere')) return { creata: false }
  if (profilo?.prova_creata) return { creata: false }

  try {
    const giorni = await getGiorniProva(supabaseUtente, ruolo)
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Segna SUBITO il flag: anche se la creazione fallisse, non ritentiamo a
    // ogni pagina (niente insert ripetuti). La prova è un omaggio best-effort.
    await admin.from('profili').update({ prova_creata: true }).eq('id', user.id)

    if (giorni <= 0) return { creata: false, giorni: 0 }

    const scadenza = new Date(Date.now() + giorni * 24 * 60 * 60 * 1000).toISOString()
    // onConflict allenatore_id: se per qualsiasi motivo esiste già una riga,
    // NON la sovrascriviamo con una prova (ignoreDuplicates).
    await admin.from('abbonamenti').upsert(
      { allenatore_id: user.id, piano: 'prova', stato: 'prova', scadenza },
      { onConflict: 'allenatore_id', ignoreDuplicates: true }
    )

    // Evita che a un utente NUOVO compaia anche il popup "Aggiornamento" della
    // versione corrente: la marchiamo come vista, così vede solo il Benvenuto.
    const { data: ultima } = await admin
      .from('versioni').select('id').eq('pubblicata', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ultima) {
      await admin.from('versioni_viste').upsert(
        { user_id: user.id, versione_id: ultima.id },
        { onConflict: 'user_id,versione_id' }
      )
    }

    return { creata: true, giorni, scadenza }
  } catch (e) {
    console.warn('assicuraProva fallita (non bloccante):', e)
    return { creata: false }
  }
}
