# GKSeason — Riepilogo intervento Sicurezza & GDPR
Documento unico. Vedi anche STATO-LAVORI.md (checklist) e la cartella
documentazione-gdpr/ (audit, procedure, SQL).

────────────────────────────────────────────────────────────
## 1. COSA È STATO FATTO
────────────────────────────────────────────────────────────

### Audit completo sicurezza + GDPR (repo pubblico letto riga per riga)
Trovati e affrontati i punti critici. Sintesi in documentazione-gdpr/00-REPORT-AUDIT.md.

### Verifica "pagine rotte dopo il multilingue" (fatta con metodo, non a occhio)
4 controlli: analisi AST delle variabili non definite su 177 file; esistenza di
ogni chiave i18n; parità delle 4 lingue; build reale + sito avviato con richieste
HTTP. Risultato: le UNICHE pagine rotte erano le 3 legali (errore 500), ora corrette
e verificate a runtime (tornano 200). La registrazione NON era rotta.

### Correzioni di codice (nel pacchetto, DA DEPLOYARE)
- Fix crash 500 di privacy-policy, cookie-policy, termini-di-servizio.
- Header di sicurezza HTTP (HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy) in next.config.mjs.
- PostHog: registrazione delle sessioni disattivata (non cattura più i dati dei
  minori in chiaro).
- Registrazione: checkbox obbligatoria di accettazione Privacy + Termini.
- Form portiere: dichiarazione dati minori (consenso genitori) alla creazione.
- Informativa privacy: nuova sezione 10 "Dati dei minori".
- Ricerca pubblica: mostra "Nome C." invece del cognome intero.
- Footer legale (link legali + identificazione del titolare) su tutte le 10 pagine
  pubbliche che ne erano prive (area riservata e landing lo avevano già).
- Cancellazione account e dati (art. 17): richiesta dall'area Account → registrata
  + email al titolare + conferma all'utente (esecuzione manuale controllata).
- Consenso cookie registrato lato server (accountability art. 7), con minimizzazione
  (nessun IP/user-agent).
- Passo B RLS: i portieri nuovi nascono con allenatore_id valorizzato.

### Modifiche al DATABASE — GIÀ ATTIVE (lanciate da te in Supabase)
- RLS Passo A: chiusa la lettura ANONIMA di portieri/squadre/stagioni (prima
  chiunque con la anon key poteva scaricare i dati dei minori). Verificato: anon = 0.
  Reso `to authenticated using(true)` per non rallentare le pagine.
- Colonna portieri.allenatore_id + indice, backfill dei portieri esistenti,
  15 portieri orfani (vuoti) assegnati al tuo account. Nessun orfano residuo.

### Verificato di sicurezza (non richiede azione)
- Next.js 15.5.25 → la vulnerabilità middleware CVE-2025-29927 (bypass login) è
  già patchata.
- Backup DB: routine custom ogni 4 ore (ok).

────────────────────────────────────────────────────────────
## 2. COSA DEVI FARE TU (in ordine)
────────────────────────────────────────────────────────────

1. DEPLOYA il codice del pacchetto (un solo commit):
     git config user.email "coianiz.cristian@gmail.com"
     git add -A
     git commit -m "Sicurezza + GDPR: pagine legali, header, consensi, minori, cognome, footer, cancellazione account, consenso cookie, prep isolamento RLS"
     git push
   Poi verifica: /privacy-policy si apre; la registrazione chiede la spunta; crei
   un portiere di prova e ha allenatore_id valorizzato; console del browser senza
   blocchi CSP (in caso, aggiungi il dominio in next.config.mjs).

2. CREA 3 oggetti in Supabase (SQL nei doc indicati):
   - tabella richieste_cancellazione .......... documentazione-gdpr/05-...md
   - tabella consensi_cookie .................. documentazione-gdpr/06-...md
   - Passo C RLS (isolamento per tenant) ...... documentazione-gdpr/passoC-rls-isolamento.sql
     (DOPO il deploy di B; a sezioni, con prova nell'app e rollback pronto)

3. ADEMPIMENTI (fuori dal codice):
   - Nomine a Responsabile / DPA con Supabase, Stripe, Resend, Vercel, PostHog,
     Meta, hCaptcha + DPA verso i coach ....... documentazione-gdpr/03-...md
   - Registro dei trattamenti (01) e procedura data breach (02): adottare e tenere.
   - 2FA su Supabase, Vercel, GitHub, Stripe.
   - Dati fiscali del titolare per l'abbonamento (P.IVA se dovuta).

────────────────────────────────────────────────────────────
## 3. COSA ASPETTA DA ME (mandami i dati e lo preparo)
────────────────────────────────────────────────────────────
- Script di cancellazione a cascata per l'ALLENATORE (distruttivo): serve la lista
  delle tabelle con foreign key verso stagioni/portieri/owner.
- Qualsiasi blocco CSP dopo il deploy, o errore del Passo C su un dettaglio del tuo
  schema: incollami il messaggio e lo sistemo.

────────────────────────────────────────────────────────────
## 4. CONTENUTO DEL PACCHETTO
────────────────────────────────────────────────────────────
- Codice (da deployare): next.config.mjs; pagine legali; RegistratiClient;
  PostHogProvider; PortiereForm; CercaAllenatoriBox; CookieBanner; LegalFooter;
  EliminaAccountBox; account/page.js; 10 layout pagine pubbliche; 2 API route
  (richiesta-cancellazione, consenso-cookie); messages it/en/de/es.
- Documentazione: RIEPILOGO.md (questo), STATO-LAVORI.md, LEGGIMI.txt,
  documentazione-gdpr/ (00 audit, 01 registro, 02 data breach, 03 DPA, 04 minori,
  05 cancellazione, 06 consenso cookie, passoC SQL).

Verifiche già eseguite: esbuild su tutti i .js; parità i18n (2246 chiavi in 4
lingue); scope-check senza bug; build di produzione compilato; pagine pubbliche e
legali testate a runtime (200, con footer, senza errori).
