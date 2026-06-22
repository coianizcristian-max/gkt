# GKT — PROGETTO.md
**Gestionale allenamento portieri** · https://gkt2026.vercel.app · repo `coianizcristian-max/gkt`

> Questo file è il punto di ripartenza. Se apri una chat nuova, leggi questo e hai tutto il contesto per partire subito senza dover rispiegare lo stato del progetto.
> Ultimo aggiornamento: 20/06/2026.

---

## 1. Stack & accessi
- **Frontend:** Next.js 15.1 / React 19 (App Router, JavaScript).
- **Backend:** Supabase (PostgreSQL + RLS + Auth + Storage). Project ref: `kaqgpdbojawjbssqrtoh`.
- **Deploy:** Vercel (dominio `gkt2026.vercel.app`).
- **Pagamenti:** Stripe (modalità test — `sk_test_`). Prezzi dinamici letti dal DB (tabella `funzionalita_config`), non da Price ID fissi.
- **Workflow di lavoro:** Cristian applica le modifiche manualmente — Claude prepara zip di patch, Cristian copia i file nel progetto locale e fa `git add -A && git commit && git push`. Build verificato su Vercel dopo ogni deploy.
- **Identità prodotto:** SaaS multi-tenant. Il nome società NON è hardcoded — viene letto dalla `stagione attiva` di ogni cliente. Società pilota di test: Azzurra Sandrigo.
- Ruoli utente: `allenatore`/`staff` (gestione completa), `collaboratore` (permessi configurabili), `portiere` (accesso limitato ai propri dati), `supervisore` (flag separato, accesso totale).

---

## 2. Stato attuale — TUTTO QUESTO È GIÀ FATTO E FUNZIONANTE

Non ripartire da zero su nessuno di questi moduli. Sono in produzione:

**Core gestionale**
- Multi-stagione, multi-categoria/squadra per allenatore.
- Portieri: anagrafica completa (foto, dati, misure, piede, contatti), card riassuntiva con statistiche.
- Calendario allenamenti con colori (verde = valutato anche se "nessuno presente", rosso = passato non valutato), filtro per categoria, sezione "da valutare" sotto al calendario.
- Allenamento singolo a 3 tab: Info / Valutazioni / Esercizi (navigazione via URL `?tab=`).
- Sistema voti centralizzato gestito da Supervisore (scala condivisa in tutta l'app).
- Valutazioni con presente/assente/nessuno, parametri multipli, retry automatico su errore di rete.
- Ricorrenze: generazione automatica allenamenti per giorno/ora/categoria (manca ancora il range data inizio-fine stagione — vedi backlog).

**Partite**
- 4 tipologie (campionato/coppa/amichevole/torneo) con tab dedicate.
- Casa/trasferta, punti portati (3/1/0/-1/-3), clean sheet automatico.
- Preview "prossimi 7/31 giorni" con bottoni colorati, partite nel calendario (viola pieno/chiaro/cornice rossa se da valutare).

**Esercizi**
- Libreria per allenatore, organizzata a tab per tipologia, tile con preview immagine+titolo, popup dettaglio.
- Link video (YouTube o altro) per ogni esercizio.
- Tipologie proposte dall'allenatore → approvazione Supervisore (pattern elenco_voci).

**Statistiche**
- Scheda portiere ricca: media voto, presenze %, clean sheet, streak, trend mensile, confronto con media categoria, prima/seconda metà stagione.
- 7 grafici SVG responsive (voti allenamenti 30gg e stagione, voti partite, gol subiti progressivi campionato/coppa, presenze mensili) — si comprimono per stare sempre nello schermo, con bottone "Espandi" per zoom.

**Portale portiere**
- Accesso via link/token legato a stagione+portiere, profilo read-only, autovalutazione solo su allenamenti dove è presente.

**Collaboratori**
- Invito via link, ruolo che condivide l'abbonamento dell'allenatore principale.

**Monetizzazione**
- Sistema paywall granulare per 9 funzionalità, configurabile da Supervisore (toggle free/a pagamento + interruttore "tutto free" globale).
- Ogni funzionalità bloccata ha un bottone "Vedi anteprima" con demo realistica dei dati prima del CTA abbonati.
- Piani mensile/annuale/lifetime con prezzi separati per ruolo allenatore/portiere, impostabili da Supervisore.
- Pagina contatto allenatore a pagamento (fee configurabile) nella ricerca pubblica.
- Sistema coupon: codice + durata configurabili da Supervisore, un utilizzo per utente, banner "periodo gratuito" in sidebar.

**Altro**
- Newsletter: editor con upload immagine reale (non URL), preview live, 2 template (solo testo / testo+foto), pagina pubblica con ultima + archivio.
- Export CSV (portieri/valutazioni/partite) dall'Archivio.
- Onboarding checklist per nuovi allenatori.
- Ricerca portieri per nome.
- SEO: metadata dinamici per pagina, Open Graph, robots.txt, sitemap.xml dinamica, JSON-LD sui profili allenatore pubblici.
- Mobile: hamburger menu, touch target ≥44px, niente zoom iOS sugli input, landing page responsive.

---

## 3. Pattern tecnici da ricordare (errori già fatti, non ripeterli)

- **FK ambigua `allenamenti`→`squadre`**: la tabella ha due FK verso squadre (`squadra_id` e `accorpata_con`). Ogni query con `squadre(nome)` va scritta esplicita: `squadra:squadre!allenamenti_squadra_id_fkey(nome)`, altrimenti Supabase ritorna errore silenzioso → dati vuoti senza crash visibile.
- **RLS è la causa #1 di "i dati ci sono ma non si vedono"**: quando qualcosa appare vuoto pur essendo presente nel DB, prima cosa da controllare è `pg_policies` sulla tabella coinvolta (incluse le tabelle joinate). Non fidarsi di `SET ROLE` nel SQL Editor per simulare `auth.uid()` — non funziona, dà sempre falsi negativi.
- **Scritture admin-only** (coupon, funzionalita_config, ecc.) vanno sempre via API route server-side con `SUPABASE_SERVICE_ROLE_KEY`, mai client-diretto, anche se sembra una semplice tabella di configurazione.
- **Stripe**: mai associare un Price dinamico a un `product` Stripe esistente — il nome mostrato sarà quello del prodotto, non quello del codice. Usare sempre `product_data` inline.
- **Validazione pre-deploy**: ogni file va validato con esbuild prima di consegnarlo, e va sempre fatto un secondo passaggio di `grep` per verificare che tutte le occorrenze di un pattern siano state sostituite (storico: destructuring `[al, cat]` non aggiornato a `[al, cat, par]` ha causato un crash in produzione).

---

## 4. BACKLOG — stato interventi

### Livelli 1-4 (i 14 punti tecnici dal documento PDF) — TUTTI COMPLETATI
1. ✅ Fix upload immagine homepage Supervisore (RLS storage bucket `sito`)
2. ✅ Verifica upload foto portiere → comparsa in card riassuntiva
3. ✅ Drag-and-drop reale ordinamento categorie
4. ✅ Attributi dinamici portiere configurabili da Supervisore
5. ✅ Tag portiere (Capitano, Talento, Da osservare, ecc.)
6. ✅ Schema valutazione personalizzato per allenatore
7. ✅ Ricorrenze con range data inizio/fine stagione (era già completo)
8. ✅ Form Suggerimenti con workflow a 4 stadi (Nuovo → In valutazione → Accettato → Implementato)
9. ✅ Dashboard "cosa devo fare oggi" (`/dashboard`, nuova destinazione post-login)
10. ✅ Sistema obiettivi avanzato (categoria, priorità, percentuale, livelli stagionale/mensile/micro)
11. ✅ Collegamento Obiettivi ↔ Valutazioni ↔ Esercizi (trend automatico dai voti storici)
12. ✅ Indice di Crescita GKT (KPI composito 0-100, gauge visivo)
13. ✅ Pagina "Percorso di crescita" (timeline cronologica)
14. ✅ Report PDF di fine stagione (`@react-pdf/renderer`, richiede `npm install`)

### Prossimi interventi — prerequisiti per andare live (non ancora affrontati)
- ⬜ **SMTP custom domain** — email di conferma registrazione finiscono spesso in spam con SMTP default Supabase. Rischio concreto per il flusso invito portiere.
- ⬜ **Stripe modalità live** — passaggio da `sk_test_` a chiavi live + nuovo webhook endpoint configurato per la modalità live.
- ⬜ **Termini & Condizioni / Privacy Policy** — pagine mancanti, requisito esplicito del documento originale prima di accettare pagamenti reali.
- ⬜ **Test di stress flusso invito→registrazione portiere** con email confirmation attiva — rischio race condition sul consumo del token invito già annotato, da verificare concretamente.
- ⬜ **Audit RLS completo** — le policy sono state sistemate via via che emergevano problemi specifici; manca un controllo sistematico di tutte le tabelle.

---

## 5. Note di processo
- Ogni nuova chat con Claude: incollare questo file (o linkare il repo) per ripartire subito senza dover rispiegare lo stato del progetto.
- Cristian testa rigorosamente e riporta bug con screenshot — fix rapidi entro la stessa sessione.
- Pattern di consegna: Claude valida sempre con esbuild prima di pacchettizzare, fornisce sempre l'elenco file-destinazione e l'eventuale SQL da eseguire PRIMA del deploy applicativo.