export const metadata = {
  title: 'Termini di Servizio | GKSeason',
  description: 'Termini e condizioni di utilizzo della piattaforma GKSeason.',
}

export default function TerminiDiServizio() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <h1>Termini di Servizio</h1>
        <p className="legal-updated">Ultimo aggiornamento: giugno 2026</p>

        <section>
          <h2>1. Accettazione dei termini</h2>
          <p>
            Utilizzando la piattaforma GKSeason — Gestionale Allenamento Portieri (&quot;il Servizio&quot;), accessibile
            all&apos;indirizzo gkt2026.vercel.app, dichiari di aver letto, compreso e accettato integralmente
            i presenti Termini di Servizio. Se non accetti questi termini, non puoi utilizzare il Servizio.
          </p>
        </section>

        <section>
          <h2>2. Descrizione del servizio</h2>
          <p>
            GKSeason è una piattaforma SaaS (Software as a Service) destinata agli allenatori dei portieri e ai
            loro staff tecnici. Permette di gestire allenamenti, valutazioni dei portieri, statistiche,
            partite, esercizi e comunicazioni con i portieri iscritti.
          </p>
          <p>
            Il Servizio è riservato a professionisti dello sport e non è destinato a minori di 18 anni.
          </p>
        </section>

        <section>
          <h2>3. Account e responsabilità</h2>
          <p>
            Per accedere al Servizio è necessario creare un account. Sei responsabile di:
          </p>
          <ul>
            <li>Mantenere la riservatezza delle credenziali di accesso.</li>
            <li>Tutte le attività svolte tramite il tuo account.</li>
            <li>Comunicare tempestivamente eventuali accessi non autorizzati.</li>
            <li>Fornire informazioni veritiere e aggiornate durante la registrazione.</li>
          </ul>
        </section>

        <section>
          <h2>4. Uso consentito</h2>
          <p>Ti impegni a utilizzare il Servizio esclusivamente per finalità lecite e in modo conforme a questi termini. È vietato:</p>
          <ul>
            <li>Caricare contenuti illegali, diffamatori, osceni o che violino diritti di terzi.</li>
            <li>Tentare di accedere a dati di altri utenti senza autorizzazione.</li>
            <li>Utilizzare il Servizio per inviare spam o comunicazioni commerciali non richieste.</li>
            <li>Effettuare reverse engineering, decompilare o copiare il software.</li>
            <li>Sovraccaricare deliberatamente l&apos;infrastruttura tecnica.</li>
          </ul>
        </section>

        <section>
          <h2>5. Dati dei portieri</h2>
          <p>
            In qualità di allenatore che inserisce dati relativi ai propri portieri, sei il &quot;titolare del
            trattamento&quot; di quei dati ai sensi del GDPR. GKSeason agisce come &quot;responsabile del trattamento&quot;
            per tuo conto. Ti impegni a:
          </p>
          <ul>
            <li>Avere una base giuridica legittima per trattare i dati dei portieri (es. consenso, contratto).</li>
            <li>Informare i portieri del trattamento dei loro dati prima di inserirli nella piattaforma.</li>
            <li>Non inserire dati sensibili non necessari all&apos;attività sportiva.</li>
          </ul>
        </section>

        <section>
          <h2>6. Piani e pagamenti</h2>
          <p>
            GKSeason offre un piano base gratuito e piani a pagamento con funzionalità avanzate. I prezzi sono
            indicati nella sezione dedicata della piattaforma. I pagamenti sono elaborati tramite Stripe.
            Non conserviamo dati delle carte di credito sui nostri server.
          </p>
          <p>
            I piani a pagamento si rinnovano automaticamente salvo disdetta. Puoi disdire in qualsiasi
            momento dalla tua area personale; il recesso ha effetto alla fine del periodo già pagato.
          </p>
        </section>

        <section>
          <h2>7. Proprietà intellettuale</h2>
          <p>
            Il software, il design e i contenuti originali di GKSeason sono di proprietà esclusiva del titolare.
            Ti è concessa una licenza limitata, non esclusiva e non trasferibile per utilizzare il Servizio.
          </p>
          <p>
            I contenuti che carichi (foto, testi, esercizi) rimangono di tua proprietà. Concedi a GKSeason una
            licenza per memorizzarli ed elaborarli al solo scopo di erogare il Servizio.
          </p>
        </section>

        <section>
          <h2>8. Limitazione di responsabilità</h2>
          <p>
            GKSeason è fornito &quot;così com&apos;è&quot;. Non garantiamo la disponibilità continua e ininterrotta del
            Servizio. Non siamo responsabili per danni indiretti, perdita di dati o mancati guadagni derivanti
            dall&apos;utilizzo o dall&apos;impossibilità di utilizzare il Servizio, salvo dolo o colpa grave.
          </p>
        </section>

        <section>
          <h2>9. Sospensione e cancellazione</h2>
          <p>
            Ci riserviamo il diritto di sospendere o cancellare account che violino questi termini,
            previa notifica via email salvo casi di violazione grave o urgente.
          </p>
          <p>
            Puoi cancellare il tuo account in qualsiasi momento contattandoci. I dati saranno eliminati
            entro 30 giorni dalla richiesta, salvo obblighi di conservazione previsti dalla legge.
          </p>
        </section>

        <section>
          <h2>10. Modifiche ai termini</h2>
          <p>
            Ci riserviamo il diritto di modificare questi termini. In caso di modifiche sostanziali,
            ti notificheremo via email con almeno 30 giorni di preavviso. L&apos;utilizzo continuato del
            Servizio dopo la notifica costituisce accettazione dei nuovi termini.
          </p>
        </section>

        <section>
          <h2>11. Legge applicabile e foro competente</h2>
          <p>
            I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente
            in via esclusiva il Foro di [INSERIRE: città del titolare], salvo diversa disposizione
            imperativa di legge applicabile ai consumatori.
          </p>
        </section>

        <section>
          <h2>12. Contatti</h2>
          <p>
            Per qualsiasi domanda: <a href="mailto:[INSERIRE EMAIL]">[INSERIRE EMAIL]</a>
          </p>
        </section>
      </div>
    </div>
  )
}
