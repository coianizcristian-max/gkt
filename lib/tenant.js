import { cache } from 'react'

// Risolve l'allenatore "owner" (titolare di stagioni/squadre) per l'utente corrente.
// - allenatore principale → è lui stesso l'owner
// - staff/collaboratore → eredita l'owner del proprio allenatore_id
// - portiere → eredita l'owner del proprio allenatore_id
// - supervisore (non allenatore) → nessun owner proprio: deve sempre specificare
//   esplicitamente quale allenatore sta amministrando, non usare questa funzione
//
// cache(): molte pagine chiamano questa funzione più volte nello stesso render
// (layout + page, o più sezioni della stessa pagina) — con cache() la query
// gira una sola volta per richiesta invece di ripetersi identica ogni volta.
export const getOwnerId = cache(async function getOwnerId(supabase, userId) {
  if (!userId) return null
  const { data: profilo } = await supabase
    .from('profili').select('ruolo, allenatore_id').eq('id', userId).maybeSingle()
  if (!profilo) return null
  if (profilo.ruolo === 'allenatore') return userId
  return profilo.allenatore_id ?? null
})

// Carica la stagione che QUESTA persona sta guardando in questo momento.
// Da quando più stagioni possono restare "attiva" insieme (una per club/società
// diversa), non basta più cercare "la" stagione attiva dell'owner: ogni persona
// (allenatore o collaboratore) ha un proprio puntatore — profili.stagione_corrente_id
// — che indica su quale sta lavorando adesso. Il selettore rapido in alto lo cambia.
//
// Restituisce { stagione, ownerId } così il chiamante ha entrambi senza una query in più.
export const getStagioneAttiva = cache(async function getStagioneAttiva(supabase, userId) {
  const ownerId = await getOwnerId(supabase, userId)
  if (!ownerId) return { stagione: null, ownerId: null }

  // 1. Puntatore personale dell'utente che sta guardando (se impostato e ancora valido)
  const { data: profiloUtente } = await supabase
    .from('profili').select('stagione_corrente_id').eq('id', userId).maybeSingle()
  if (profiloUtente?.stagione_corrente_id) {
    const { data: corrente } = await supabase
      .from('stagioni').select('*')
      .eq('id', profiloUtente.stagione_corrente_id).eq('owner_id', ownerId).eq('attiva', true)
      .maybeSingle()
    if (corrente) return { stagione: corrente, ownerId }
  }

  // 2. Nessun puntatore valido: scegli la stagione attiva più recente come default
  //    e salvala come corrente per questo utente, così le prossime volte è già pronta.
  const { data: fallback } = await supabase
    .from('stagioni').select('*').eq('owner_id', ownerId).eq('attiva', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (fallback) {
    await supabase.from('profili').update({ stagione_corrente_id: fallback.id }).eq('id', userId)
  }
  return { stagione: fallback ?? null, ownerId }
})
