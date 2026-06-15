# Gestionale Portieri — Azzurra Sandrigo

Web app per la gestione di allenamenti, valutazioni e statistiche dei portieri.
Stack: Next.js (App Router) + Supabase.

## Avvio in locale

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Copia `.env.local.example` in `.env.local` e inserisci i valori del tuo
   progetto Supabase (Project Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Avvia:
   ```bash
   npm run dev
   ```
   App su http://localhost:3000

## Database

Esegui nell'SQL Editor di Supabase, in quest'ordine:
1. `01_schema_portieri.sql` — tabelle, indici, RLS, dati iniziali
2. `02_dati_2025_26.sql` — import della stagione 2025-26
3. `03_auth_profili.sql` — creazione automatica profilo + ruoli

## Primo accesso

1. In Supabase → Authentication → Users → crea il tuo utente (email + password),
   oppure abilita la registrazione e registrati dall'app.
2. Esegui l'`UPDATE` finale in `03_auth_profili.sql` con la tua email per
   diventare `allenatore` (privilegi pieni).
3. Entra dall'app con email e password.

## Struttura

- `lib/supabase/` — client Supabase (browser, server, middleware)
- `middleware.js` — protezione rotte + refresh sessione
- `app/login/` — pagina di accesso
- `app/(app)/` — area protetta: portieri, calendario, partite, statistiche
