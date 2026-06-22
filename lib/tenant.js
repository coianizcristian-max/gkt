// Risolve l'allenatore "owner" (titolare di stagioni/squadre) per l'utente corrente.
// - allenatore principale → è lui stesso l'owner
// - staff/collaboratore → eredita l'owner del proprio allenatore_id
// - portiere → eredita l'owner del proprio allenatore_id
// - supervisore (non allenatore) → nessun owner proprio: deve sempre specificare
//   esplicitamente quale allenatore sta amministrando, non usare questa funzione

export async function getOwnerId(supabase, userId) {
  if (!userId) return null
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, allenatore_id').eq('id', userId).maybeSingle()
  if (!profilo) return null
  if (profilo.ruolo === 'allenatore') return userId
  return profilo.allenatore_id ?? null
}

// Carica la stagione attiva DELL'OWNER corretto (non più un singleton globale).
// Restituisce { stagione, ownerId } così il chiamante ha entrambi senza una query in più.
export async function getStagioneAttiva(supabase, userId) {
  const ownerId = await getOwnerId(supabase, userId)
  if (!ownerId) return { stagione: null, ownerId: null }
  const { data: stagione } = await supabase
    .from('stagioni').select('*').eq('attiva', true).eq('owner_id', ownerId).maybeSingle()
  return { stagione: stagione ?? null, ownerId }
}
