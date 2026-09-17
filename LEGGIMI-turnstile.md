# GKSeason — da hCaptcha a Cloudflare Turnstile

4 file: `app/components/Captcha.js` (nuovo), le due pagine login e registrati,
e `next.config.mjs` per la CSP.

## Perche'

Su hCaptcha Basic i quattro livelli di difficolta' decidono **quanto sono
difficili** i rompicapo, non **se** appaiono: la verifica passiva e' riservata
ai piani a pagamento. Turnstile e' gratuito, supportato nativamente da Supabase
Auth, e non mostra rompicapo.

## Cosa c'e' dentro

`Captcha.js` espone **la stessa identica interfaccia** del vecchio componente
hCaptcha (`ref.resetCaptcha()`, `onVerify`, `onExpire`), quindi le due pagine
cambiano di due righe e tornare indietro e' altrettanto rapido. Non aggiunge
nessun pacchetto: carica lo script ufficiale di Cloudflare.

La CSP ora consente `challenges.cloudflare.com` su script-src, connect-src e
frame-src. **Ho lasciato dentro anche hCaptcha**: se qualcosa va storto puoi
tornare indietro senza dover ridistribuire anche la configurazione.

La sitekey arriva da `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Se la variabile manca,
il captcha **non viene mostrato** invece di puntare a una chiave del fornitore
sbagliato: e' una scelta voluta, meglio nessun captcha che un widget rotto che
blocca il login a tutti.

---

# Sequenza, nell'ordine giusto

Il punto delicato: Supabase verifica il token con il fornitore che ha
configurato. Se il sito manda un token Turnstile mentre Supabase si aspetta
hCaptcha (o viceversa), **il login rifiuta tutti**. Per non avere quella
finestra, si passa da uno stato senza captcha.

### 1. Crea la sitekey su Cloudflare

dash.cloudflare.com → Turnstile → Add widget.
- Domini: `gkseason.it` e `www.gkseason.it`
- Widget Mode: **Managed**
- Ti restituisce **Site Key** (pubblica) e **Secret Key** (privata)

### 2. Metti la Site Key su Vercel

Progetto gkt → Settings → Environment Variables → nuova variabile:
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` = la Site Key. Ambienti: Production + Preview.

Lascia pure `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` dov'e', se esiste: non da' fastidio.

### 3. Disattiva temporaneamente il captcha su Supabase

Dashboard Supabase → Authentication → **Attack Protection** → sezione CAPTCHA →
**disattiva**. Da questo momento login e registrazione funzionano senza captcha:
nessun utente resta fuori durante il passaggio.

### 4. Pusha i 4 file e aspetta il deploy verde

Durante il deploy il sito vecchio continua a girare, e il captcha e' disattivato
lato Supabase: qualunque cosa succeda, si entra.

### 5. Riattiva il captcha su Supabase, stavolta con Turnstile

Stessa schermata: attiva CAPTCHA, provider **Turnstile**, incolla la **Secret
Key** di Cloudflare. Salva.

### 6. Prova subito

Finestra anonima → gkseason.it/login. Deve comparire il widget Turnstile, e
**non deve mai chiedere di selezionare immagini**. Fai un login vero e controlla
che entri. Poi la stessa cosa su /registrati.

Tieni la finestra di disattivazione (passi 3-5) piu' corta possibile: sono pochi
minuti senza captcha, meglio farli in una fascia oraria tranquilla.

---

## Se qualcosa va storto

Torna al punto 3 (captcha disattivato su Supabase): il sito resta utilizzabile.
Poi decidi con calma se rimettere hCaptcha — la CSP lo consente ancora, basta
ripristinare i due file dal repo e rimettere il provider hCaptcha su Supabase.

## Dopo, quando sei tranquillo

- Rimuovi la dipendenza `@hcaptcha/react-hcaptcha` da package.json
- Togli hCaptcha dalla CSP in `next.config.mjs`
- Cancella la variabile `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` da Vercel

Nessuna di queste tre e' urgente.

## Una cosa da controllare fra qualche giorno

In PostHog, l'evento `login_fallito` ora porta con se' il motivo. Se prima del
passaggio vedevi fallimenti legati al captcha, dopo dovrebbero sparire. E' la
verifica che questo lavoro e' servito davvero e non solo a togliere un fastidio
tuo: nella settimana del 30 agosto i login falliti erano il 55%.
