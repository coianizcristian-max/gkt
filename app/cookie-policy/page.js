export const metadata = {
  title: 'Cookie Policy | GKT',
  description: 'Informativa sull\'uso dei cookie su GKT.',
}

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>Cookie Policy</h1>
        <p className="legal-updated">Ultimo aggiornamento: giugno 2026</p>

        <section>
          <h2>1. Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo che i siti web salvano nel tuo browser quando li visiti.
            Servono a far funzionare il sito, ricordare le tue preferenze o raccogliere informazioni statistiche sull&apos;utilizzo.
          </p>
        </section>

        <section>
          <h2>2. Cookie utilizzati da questo sito</h2>

          <h3>Cookie tecnici (sempre attivi)</h3>
          <p>Necessari per il funzionamento del sito. Non richiedono consenso.</p>
          <table className="legal-table">
            <thead><tr><th>Nome</th><th>Fornitore</th><th>Scopo</th><th>Durata</th></tr></thead>
            <tbody>
              <tr><td>sb-*</td><td>Supabase</td><td>Sessione di autenticazione</td><td>Sessione / 1 anno</td></tr>
              <tr><td>gkt-cookie-consent</td><td>GKT (locale)</td><td>Memorizza la tua scelta sui cookie</td><td>1 anno</td></tr>
            </tbody>
          </table>

          <h3>Cookie analitici (richiedono consenso)</h3>
          <p>Usati per capire come gli utenti utilizzano il sito e migliorarne l&apos;esperienza. Attivati solo dopo il tuo consenso.</p>
          <table className="legal-table">
            <thead><tr><th>Nome</th><th>Fornitore</th><th>Scopo</th><th>Durata</th></tr></thead>
            <tbody>
              <tr><td>ph_*</td><td>PostHog (EU)</td><td>Analytics anonimizzato: pagine visitate, funnel di utilizzo, performance</td><td>1 anno</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>3. Come gestire i cookie</h2>
          <p>Puoi gestire le tue preferenze in qualsiasi momento:</p>
          <ul>
            <li>
              <strong>Tramite il banner</strong>: al primo accesso al sito compare un banner che ti permette di
              accettare o rifiutare i cookie analitici. Puoi cambiare idea cliccando su
              &quot;Gestisci preferenze cookie&quot; nel footer del sito.
            </li>
            <li>
              <strong>Tramite il browser</strong>: puoi bloccare o cancellare i cookie dalle impostazioni del
              browser. Tieni presente che disabilitare i cookie tecnici potrebbe compromettere il funzionamento del sito.
            </li>
          </ul>
          <p>Guide per i principali browser:</p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
            <li><a href="https://support.mozilla.org/it/kb/Attivare%20e%20disattivare%20i%20cookie" target="_blank" rel="noopener noreferrer">Firefox</a></li>
            <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
            <li><a href="https://support.microsoft.com/it-it/windows/eliminare-e-gestire-i-cookie-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Edge</a></li>
          </ul>
        </section>

        <section>
          <h2>4. Opt-out PostHog</h2>
          <p>
            Per disattivare specificamente il tracciamento PostHog puoi anche visitare la loro pagina di opt-out:
            {' '}<a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">posthog.com/privacy</a>.
          </p>
        </section>

        <section>
          <h2>5. Aggiornamenti</h2>
          <p>
            Questa cookie policy può essere aggiornata periodicamente. La data di ultimo aggiornamento è
            indicata in cima alla pagina. Ti consigliamo di consultarla periodicamente.
          </p>
        </section>

        <section>
          <h2>6. Contatti</h2>
          <p>
            Per qualsiasi domanda sui cookie utilizzati: <a href="mailto:[INSERIRE EMAIL]">[INSERIRE EMAIL]</a>
          </p>
        </section>
      </div>
    </div>
  )
}
