# Checklist test isolamento multi-tenant — GKT

Da eseguire **prima** del lancio stagione 2026-27, dopo aver applicato il refactoring multi-tenant (SQL + 28 file). Serve un secondo account allenatore di prova, indipendente dal tuo.

## 0. Setup — crea il secondo account

- [ ] Registra un nuovo account email (es. `test-allenatore2@...`) tramite `/login` (non tramite invito — deve diventare un allenatore principale, non un collaboratore)
- [ ] Tramite Supabase, imposta manualmente su quel profilo `ruolo = 'allenatore'` (la registrazione normale da `/login` non assegna questo ruolo da sola)
- [ ] Verifica che il nuovo account **non** abbia il flag `supervisore = true`
- [ ] Logga con l'account di prova e crea: una stagione (es. "Test 2026-27"), almeno una categoria/squadra, un portiere

A questo punto hai due allenatori indipendenti con dati propri. I test seguenti vanno fatti **alternando** i due account (logout/login), confrontando cosa vede l'uno rispetto all'altro.

## 1. Isolamento stagioni e categorie

- [ ] Account A vede solo le proprie stagioni in `/supervisore/stagioni` (non quelle dell'account B)
- [ ] Account A vede solo le proprie categorie in `/supervisore/categorie` (non quelle dell'account B)
- [ ] Attiva una stagione diversa sull'account A → verifica che la stagione attiva dell'account B **non** cambi (era il bug #5, il più grave trovato: prima questa azione disattivava le stagioni di tutti)
- [ ] Account A crea una nuova stagione → verifica che compaia correttamente nella sua lista e **non** in quella dell'account B

## 2. Isolamento portieri, calendario, partite

- [ ] Account A in `/portieri` vede solo i propri portieri, non quelli dell'account B
- [ ] Account A in `/calendario` vede solo i propri allenamenti
- [ ] Account A in `/partite` vede solo le proprie partite
- [ ] Account A in `/statistiche` vede numeri coerenti solo con i propri dati (nessuna media "inquinata" da valutazioni dell'account B)
- [ ] Dashboard (`/dashboard`) di account A mostra "da valutare", prossimo allenamento, partite imminenti solo propri

## 3. Isolamento esercizi

- [ ] Account A in `/esercizi` vede solo la propria libreria
- [ ] Crea un esercizio su account A con "Pubblico" attivato → verifica che compaia nella libreria pubblica visibile da account B dentro un allenamento (tab "Libreria pubblica" in un allenamento), ma **non** nella sua "La mia libreria"
- [ ] Crea un esercizio su account A **senza** "Pubblico" → verifica che NON sia visibile in nessun modo dall'account B

## 4. I 5 bug specifici trovati nell'audit — verifica puntuale che siano risolti

- [ ] **Bug #1**: logga come portiere (vedi punto 5) e prova ad aprire direttamente `/calendario/nuovo`, `/partite/nuova`, `/portieri/nuovo` — deve reindirizzare, non mostrare il form
- [ ] **Bug #2**: logga come portiere, apri una partita della tua categoria da `/partite` → deve mostrare solo la tua valutazione (voto/punti/note), mai il form di modifica partita né le valutazioni dei compagni
- [ ] **Bug #3**: logga con l'account B (allenatore normale, **non** vero supervisore) e prova ad aprire `/supervisore` (home sito) → deve reindirizzare via, non mostrare l'editor della home page pubblica
- [ ] **Bug #4**: logga come portiere dell'account A, prova ad aprire `/portieri/[id]` con l'id di un **altro** portiere (copialo dall'URL quando sei loggato come allenatore) → deve dare pagina non trovata, non la scheda altrui
- [ ] **Bug #5**: già coperto al punto 1 (cambio stagione attiva non deve toccare l'altro account)

## 5. Flusso portiere e collaboratore

- [ ] Genera un invito portiere dall'account A (`/inviti`), completa la registrazione con quel link
- [ ] Il portiere, una volta loggato, vede solo i dati della propria categoria/squadra (allenamenti, partite, statistiche)
- [ ] Genera un invito collaboratore dall'account A con permessi ristretti (es. "Portieri: solo visualizza", "Partite: nessun accesso")
- [ ] Il collaboratore, una volta loggato, **non vede il link "Partite"** in sidebar e viene reindirizzato se prova a digitare `/partite` direttamente
- [ ] Il collaboratore vede la libreria esercizi **dell'account A** (non vuota, non la propria) — era uno dei bug minori trovati durante il refactoring
- [ ] Il collaboratore che crea una nuova categoria/stagione (se ha i permessi per farlo) la vede attribuita correttamente all'account A, non a se stesso

## 6. Area Supervisore vera (solo il tuo account, se hai il flag `supervisore`)

- [ ] `/supervisore/funzionalita`, `/supervisore/attributi`, `/supervisore/coupon`, `/supervisore/abbonamenti`, `/supervisore/newsletter` restano raggiungibili solo da te
- [ ] `/supervisore/elenchi` (scala voti, tag, tipologie esercizi) resta globale: una modifica fatta lì deve essere visibile sia all'account A che all'account B (è l'unica area volutamente condivisa tra tutti i clienti)
- [ ] Verifica che la cartella `/supervisore/inviti` sia stata effettivamente rimossa dal repo e l'URL dia 404

## 7. Verifica finale di non-regressione

- [ ] Tutti i flussi già testati in precedenza (creazione allenamento, valutazione, partita, obiettivi, report PDF, percorso di crescita) funzionano ancora normalmente sull'account principale A, senza errori nuovi introdotti dal refactoring

---

**Se un punto qualsiasi fallisce**, segnalamelo con screenshot — indica quale numero di checklist è e cosa hai visto invece di quello atteso.