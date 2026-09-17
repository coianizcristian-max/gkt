import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getDemoConfig } from '@/lib/demo'

/**
 * DIAGNOSI TEMPORANEA dell'ingresso ospite.
 *
 * Apri https://gkseason.it/api/ospite/diagnosi e leggi il campo "esito":
 * dice quale dei controlli di /api/ospite sta fallendo.
 *
 * Non restituisce MAI la password ne' altre chiavi: solo esiti booleani e
 * il messaggio d'errore di Supabase.
 *
 * >>> CANCELLA QUESTO FILE UNA VOLTA RISOLTO <<<
 */
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const r = {
    envEmailPresente: !!process.env.DEMO_OSPITE_EMAIL,
    envPasswordPresente: !!process.env.DEMO_OSPITE_PASSWORD,
    emailConfigurata: process.env.DEMO_OSPITE_EMAIL ?? null,
    demoAttiva: null,
    demoOwnerEmail: null,
    demoOwnerTrovato: null,
    utentiScansionati: null,
    ospiteTrovatoNellaLista: null,
    loginOspite: null,
    ospiteId: null,
    ospiteUgualeOwner: null,
    ruoloOspite: null,
    esito: null,
  }

  if (!r.envEmailPresente || !r.envPasswordPresente) {
    r.esito = 'Variabili d\'ambiente mancanti in questo deploy. Aggiungile su Vercel e RIDEPLOYA: valgono dal deploy successivo.'
    return NextResponse.json(r)
  }

  // ── stato della configurazione demo ──────────────────────────────────
  const cfg = await getDemoConfig()
  r.demoAttiva = cfg.attiva
  r.demoOwnerEmail = cfg.ownerEmail
  r.demoOwnerTrovato = !!cfg.ownerId

  // getDemoConfig risolve l'owner scorrendo i primi 200 utenti: se l'account
  // sono di piu', demo@gkt.test puo' non essere trovato. Qui lo misuriamo.
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )
    const { data: elenco } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    r.utentiScansionati = elenco?.users?.length ?? 0
    r.ospiteTrovatoNellaLista = !!elenco?.users?.find(
      (u) => u.email === process.env.DEMO_OSPITE_EMAIL)
  } catch (e) {
    r.utentiScansionati = 'errore: ' + (e?.message ?? 'sconosciuto')
  }

  if (!r.demoAttiva) {
    r.esito = 'La modalita\' demo e\' SPENTA. Pannello supervisore -> tab Demo -> attiva, oppure: update demo_config set valore=\'true\' where chiave=\'attiva\';'
    return NextResponse.json(r)
  }
  if (!r.demoOwnerTrovato) {
    r.esito = r.utentiScansionati >= 200
      ? 'Owner demo NON risolto e la lista utenti e\' piena (200). getDemoConfig scorre solo i primi 200 utenti: demo@gkt.test non viene trovato. Va alzato il perPage in lib/demo.js.'
      : 'Owner demo NON trovato: controlla che demo_config.owner_email corrisponda a un utente esistente in Authentication.'
    return NextResponse.json(r)
  }

  // ── prova di login dell'ospite ───────────────────────────────────────
  const finta = NextResponse.json({})
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return [] },
        setAll(c) { c.forEach(({ name, value, options }) => finta.cookies.set(name, value, options)) },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.DEMO_OSPITE_EMAIL,
    password: process.env.DEMO_OSPITE_PASSWORD,
  })

  if (error || !data?.user) {
    r.loginOspite = 'FALLITO: ' + (error?.message ?? 'nessun utente restituito')
    r.esito = /confirm/i.test(error?.message ?? '')
      ? 'Login fallito: email NON confermata. Supabase -> Authentication -> l\'utente ospite -> conferma l\'email (o ricrealo con "Auto Confirm User" spuntato).'
      : 'Login fallito: email o password nelle variabili d\'ambiente non corrispondono a quelle dell\'utente su Supabase.'
    return NextResponse.json(r)
  }

  r.loginOspite = 'ok'
  r.ospiteId = data.user.id
  r.ospiteUgualeOwner = data.user.id === cfg.ownerId

  const { data: profilo } = await supabase
    .from('profili').select('ruolo').eq('id', data.user.id).maybeSingle()
  r.ruoloOspite = profilo?.ruolo ?? null

  await supabase.auth.signOut().catch(() => {})

  if (r.ospiteUgualeOwner) {
    r.esito = 'L\'utente ospite coincide con il proprietario della demo: servono due account distinti.'
  } else if (r.ruoloOspite !== 'allenatore') {
    r.esito = `Il profilo dell'ospite ha ruolo "${r.ruoloOspite}" invece di "allenatore": la demo e' riservata ai preparatori. Correggi con: update profili set ruolo='allenatore' where id='${data.user.id}';`
  } else {
    r.esito = 'Tutti i controlli passano: /d dovrebbe funzionare. Riprova IN INCOGNITO (da finestra normale sei gia\' loggato e vieni mandato in dashboard).'
  }

  return NextResponse.json(r)
}
