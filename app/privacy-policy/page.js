export const metadata = {
  title: 'Informativa sulla Privacy | GKSeason',
  description: 'Informativa sul trattamento dei dati personali ai sensi del GDPR.',
}

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>Informativa sulla Privacy</h1>
        <p className="legal-updated">Ultimo aggiornamento: giugno 2026</p>

        <section>
          <h2>1. Titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati personali è:<br />
            <strong>[INSERIRE: Nome e Cognome o Ragione Sociale]</strong><br />
            [INSERIRE: Indirizzo completo]<br />
            [INSERIRE: P.IVA o Codice Fiscale]<br />
            Email: <a href="mailto:[INSERIRE EMAIL]">[INSERIRE EMAIL]</a>
          </p>
        </section>

        <section>
          <h2>2. Dati raccolti</h2>
          <p>GKSeason raccoglie le seguenti categorie di dati personali:</p>
          <ul>
            <li><strong>Dati di registrazione</strong>: nome, cognome, indirizzo email, password (in forma cifrata).</li>
            <li><strong>Dati del profilo</strong>: ruolo (allenatore, staff, portiere), fotografia, città, CAP, provincia, coordinate geografiche approssimative, biografia professionale, esperienze e certificati.</li>
            <li><strong>Dati di utilizzo del servizio</strong>: allenamenti, partite, valutazioni dei portieri, obiettivi, statistiche, esercizi.</li>
            <li><strong>Dati di navigazione</strong>: indirizzo IP, tipo di browser, pagine visitate, durata delle sessioni (tramite PostHog Analytics).</li>
            <li><strong>Dati di contatto</strong>: messaggi inviati tramite il modulo contatto allenatori (nome, email, telefono, messaggio).</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalità e basi giuridiche del trattamento</h2>
          <table className="legal-table">
            <thead>
              <tr><th>Finalità</th><th>Base giuridica</th></tr>
            </thead>
            <tbody>
              <tr><td>Erogazione del servizio (gestione account, allenamenti, valutazioni)</td><td>Esecuzione del contratto (art. 6.1.b GDPR)</td></tr>
              <tr><td>Invio comunicazioni di servizio (notifiche, inviti)</td><td>Esecuzione del contratto (art. 6.1.b GDPR)</td></tr>
              <tr><td>Analisi statistica dell&apos;utilizzo per migliorare il servizio</td><td>Consenso (art. 6.1.a GDPR)</td></tr>
              <tr><td>Adempimenti fiscali e contabili</td><td>Obbligo legale (art. 6.1.c GDPR)</td></tr>
              <tr><td>Prevenzione di frodi e sicurezza informatica</td><td>Legittimo interesse (art. 6.1.f GDPR)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>4. Conservazione dei dati</h2>
          <p>I dati vengono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti:</p>
          <ul>
            <li>Dati dell&apos;account: per tutta la durata del rapporto contrattuale e per 10 anni successivi alla cessazione (obblighi fiscali).</li>
            <li>Dati di analytics: 12 mesi dalla raccolta.</li>
            <li>Messaggi di contatto: 2 anni dall&apos;ultimo scambio.</li>
          </ul>
        </section>

        <section>
          <h2>5. Destinatari dei dati</h2>
          <p>I dati personali possono essere comunicati a:</p>
          <ul>
            <li><strong>Supabase Inc.</strong> (USA) — infrastruttura database e autenticazione, con garanzie adeguate ai sensi dell&apos;art. 46 GDPR.</li>
            <li><strong>Vercel Inc.</strong> (USA) — hosting e deployment dell&apos;applicazione.</li>
            <li><strong>PostHog Inc.</strong> (EU) — analytics, con server in Europa.</li>
            <li><strong>Stripe Inc.</strong> (USA) — elaborazione pagamenti, soggetto a certificazione PCI-DSS.</li>
          </ul>
          <p>I dati non vengono venduti né ceduti a terzi per finalità di marketing.</p>
        </section>

        <section>
          <h2>6. Trasferimenti internazionali</h2>
          <p>
            Alcuni fornitori sopra elencati hanno sede negli Stati Uniti. I trasferimenti avvengono sulla base delle
            Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea, o nel quadro dell&apos;EU-US
            Data Privacy Framework dove applicabile.
          </p>
        </section>

        <section>
          <h2>7. Diritti dell&apos;interessato</h2>
          <p>Ai sensi degli artt. 15-22 GDPR, hai diritto di:</p>
          <ul>
            <li><strong>Accesso</strong>: ottenere conferma del trattamento e copia dei dati.</li>
            <li><strong>Rettifica</strong>: correggere dati inesatti o incompleti.</li>
            <li><strong>Cancellazione</strong> (&quot;diritto all&apos;oblio&quot;): richiedere la cancellazione dei dati quando non più necessari.</li>
            <li><strong>Limitazione</strong>: richiedere la limitazione del trattamento in determinati casi.</li>
            <li><strong>Portabilità</strong>: ricevere i dati in formato strutturato e leggibile da macchina.</li>
            <li><strong>Opposizione</strong>: opporti al trattamento basato su legittimo interesse.</li>
            <li><strong>Revoca del consenso</strong>: revocare in qualsiasi momento il consenso prestato, senza pregiudizio per la liceità del trattamento precedente.</li>
          </ul>
          <p>
            Per esercitare i tuoi diritti, scrivi a <a href="mailto:[INSERIRE EMAIL]">[INSERIRE EMAIL]</a>.
            Hai inoltre diritto di proporre reclamo al Garante per la Protezione dei Dati Personali
            (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).
          </p>
        </section>

        <section>
          <h2>8. Sicurezza</h2>
          <p>
            Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non
            autorizzati, perdita o alterazione: crittografia in transito (HTTPS/TLS), password cifrate con
            algoritmi sicuri, accesso ai dati limitato al personale autorizzato, backup regolari.
          </p>
        </section>

        <section>
          <h2>9. Cookie</h2>
          <p>
            Per informazioni dettagliate sui cookie utilizzati dal sito, consulta la nostra{' '}
            <a href="/cookie-policy">Cookie Policy</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
