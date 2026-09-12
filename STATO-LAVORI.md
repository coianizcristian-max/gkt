# GKSeason — Stato lavori Sicurezza & GDPR
Riepilogo di tutto. Legenda: [FATTO] già attivo · [DA DEPLOYARE] pronto in questo zip · [TU] azione tua fuori dal codice.

## A. Pagine rotte (i18n)
- [DA DEPLOYARE] Fix crash 500 di privacy-policy, cookie-policy, termini-di-servizio
  (variabili locale/c non definite). Verificato con build + sito avviato: dopo il
  fix rispondono 200 con contenuto. Erano le UNICHE pagine rotte del sito.

## B. Cybersecurity
- [FATTO] Next.js 15.5.25 → la vulnerabilità middleware (CVE-2025-29927, bypass
  login) è già patchata.
- [FATTO] RLS: chiusa la lettura ANONIMA di portieri/squadre/stagioni (era `true`
  per {public} = dati dei minori scaricabili da chiunque). Ora solo autenticati.
  Verificato: anon = 0 righe. Versione `to authenticated using(true)` = veloce.
- [DA DEPLOYARE] Header di sicurezza HTTP (HSTS, CSP, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy) in next.config.mjs.
- [DA DEPLOYARE] PostHog: registrazione sessioni disattivata (non cattura più i
  dati dei minori in chiaro).
- [DA DEPLOYARE] Passo B: i portieri nuovi nascono con allenatore_id (prerequisito
  isolamento). Da mettere online PRIMA del Passo C.
- [TU, dopo B] Passo C: policy RLS per isolamento fra società
  (documentazione-gdpr/passoC-rls-isolamento.sql). A sezioni, con prova nell'app
  e rollback. Sezione 1 = portieri (priorità: dati minori). Sezione 2 =
  stagioni/squadre (dati meno sensibili).
- [TU] 2FA su Supabase, Vercel, GitHub, Stripe.
- [FATTO] Backup: routine custom ogni 4 ore (ok, confermato da te).

## C. GDPR
- [DA DEPLOYARE] Checkbox obbligatoria accettazione Privacy+Termini in registrazione.
- [DA DEPLOYARE] Dichiarazione dati minori nel form portiere (consenso genitori).
- [DA DEPLOYARE] Sezione 10 "Dati dei minori" nell'informativa privacy.
- [DA DEPLOYARE] Ricerca pubblica: mostra "Nome C." invece del cognome intero.
- [TU] Nomine a Responsabile / DPA con Supabase, Stripe, Resend, Vercel, PostHog,
  Meta, hCaptcha, e DPA verso i coach (checklist in 03-responsabili-e-nomine-dpa.md).
- [TU] Registro trattamenti (bozza in 01), Procedura data breach (in 02),
  Modello consenso genitori (in 04) — da adottare e tenere aggiornati.

## D. Ancora aperti (consigliati, non nello zip)
- [DA DEPLOYARE] Informativa raggiungibile da OGNI pagina: aggiunto footer legale
  (link privacy/cookie/termini + identificazione titolare) alle 10 pagine pubbliche
  che ne erano prive, via layout (nuovo componente LegalFooter). Area riservata e
  landing avevano gia' il loro footer. Verificato a runtime su sito avviato.
- [DA DEPLOYARE] Funzione "cancella account e dati" (art. 17): box nell'area
  Account che invia una RICHIESTA (registrata + email al titolare + conferma
  all'utente). L'esecuzione è manuale e controllata: vedi
  documentazione-gdpr/05-cancellazione-account-procedura.md.
  PRIMA crea la tabella `richieste_cancellazione` (SQL nel doc 05).
- [DA DEPLOYARE] Consenso cookie registrato lato server (accountability art. 7):
  il banner ora logga la scelta via /api/consenso-cookie (id casuale, scelta,
  versione, data; niente IP/UA). PRIMA crea la tabella `consensi_cookie`
  (SQL in documentazione-gdpr/06-consenso-cookie.md).
- [TU] Dati identificativi del titolare accessibili dal sito (con l'abbonamento a
  pagamento).

## Ordine consigliato di deploy
1. Deploya TUTTO il codice di questo zip (un solo commit) → chiude A, gli header,
   PostHog, i consensi, i minori, il cognome, e mette online il Passo B.
2. Verifica: privacy-policy apre senza errore; registrazione chiede la spunta;
   crei un portiere di prova e ha allenatore_id valorizzato.
3. Poi, in un momento tranquillo, lancia il Passo C (Sezione 1), prova, poi Sezione 2.
