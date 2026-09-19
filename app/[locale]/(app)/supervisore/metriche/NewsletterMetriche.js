// Sezione "Newsletter" di Supervisore > Metriche (server component).
// Legge newsletter_iscritti con il client dell'utente (il supervisore ha
// gia' accesso in lettura, come nella pagina Supervisore > Newsletter).
//
// Conteggi sugli iscritti ATTIVI, esclusi gli account interni.
// "Nuovi" = data del consenso (consenso_il) se c'e', altrimenti la data di
// creazione della riga (iscrizioni precedenti al tracciamento).
//
// Provenienza = canale (da dove e' arrivato) + punto (dove si e' iscritto):
//   canale: colonna fonte (utm_source, meta_ads, social_meta) -> macroarea
//   punto:  colonna origine (demo, home) oppure registrazione (utente_id)

const GIORNO = 24 * 60 * 60 * 1000

const FONTI_META_ADS = ['facebook', 'instagram', 'fb', 'ig', 'meta', 'meta_ads']

function canaleDi(fonte) {
  if (!fonte) return 'diretto'
  if (FONTI_META_ADS.includes(fonte)) return 'metaAds'
  if (fonte === 'social_meta') return 'social'
  if (fonte === 'newsletter') return 'email'
  return 'altro'
}

function puntoDi(r) {
  if (r.origine === 'demo') return 'demo'
  if (r.origine === 'home') return 'home'
  if (r.utente_id) return 'registrazione'
  return 'storico'
}

async function leggiIscritti(supabase) {
  const conFonte = await supabase.from('newsletter_iscritti')
    .select('email, attivo, created_at, consenso_il, origine, utente_id, fonte')
    .range(0, 9999)
  if (!conFonte.error) return { righe: conFonte.data ?? [], fonteDisponibile: true }
  // Colonna fonte non ancora creata (SQL non eseguito): conteggi senza canale.
  const senza = await supabase.from('newsletter_iscritti')
    .select('email, attivo, created_at, consenso_il, origine, utente_id')
    .range(0, 9999)
  return { righe: senza.data ?? [], fonteDisponibile: false, errore: senza.error }
}

export default async function NewsletterMetriche({ supabase, t, esclusi = [] }) {
  const { righe, fonteDisponibile, errore } = await leggiIscritti(supabase)
  if (errore) {
    return <div className="err" style={{ marginBottom: 16 }}>{t('erroreCaricamento')}{errore.message}</div>
  }

  const ora = Date.now()
  const interni = righe.filter((r) => !esclusi.includes(String(r.email || '').toLowerCase()))
  const attivi = interni.filter((r) => r.attivo)
  const nonAttivi = interni.length - attivi.length
  const dataDi = (r) => new Date(r.consenso_il || r.created_at).getTime()
  const nuoviIn = (giorni) => attivi.filter((r) => ora - dataDi(r) <= giorni * GIORNO).length

  // Raggruppo per canale + punto
  const gruppi = {}
  for (const r of attivi) {
    const canale = fonteDisponibile ? canaleDi(r.fonte) : 'nonTracciato'
    const punto = puntoDi(r)
    const k = `${canale}|${punto}`
    if (!gruppi[k]) gruppi[k] = { canale, punto, totale: 0, ultimi7: 0 }
    gruppi[k].totale += 1
    if (ora - dataDi(r) <= 7 * GIORNO) gruppi[k].ultimi7 += 1
  }
  const elenco = Object.values(gruppi).sort((a, b) => b.ultimi7 - a.ultimi7 || b.totale - a.totale)

  const Numero = ({ valore, label }) => (
    <div style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--sfondo-soft, #f6f8fa)', borderRadius: 10 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blu, #0a7ec2)' }}>{valore}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft, #6b7e8e)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )

  const th = { padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'left' }
  const td = { padding: '8px 6px', borderBottom: '1px solid var(--linea, #e2e6e1)' }
  const tdR = { ...td, textAlign: 'right', fontWeight: 600 }

  return (
    <div className="scheda" style={{ maxWidth: 'none', marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 12px' }}>{t('nlTitolo')}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 8 }}>
        <Numero valore={attivi.length} label={t('nlTotale')} />
        <Numero valore={nuoviIn(1)} label={t('nlUltimoGiorno')} />
        <Numero valore={nuoviIn(3)} label={t('nlUltimi3')} />
        <Numero valore={nuoviIn(7)} label={t('nlUltimi7')} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', margin: '0 0 14px' }}>
        {t('nlNota', { n: nonAttivi })}
      </p>

      <h4 style={{ margin: '0 0 6px', fontSize: 14 }}>{t('nlProvenienza')}</h4>
      {!fonteDisponibile && (
        <p style={{ fontSize: 12, color: 'var(--rosso, #d6493b)', margin: '0 0 8px' }}>{t('nlFonteMancante')}</p>
      )}
      {elenco.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-soft, #6b7e8e)', margin: 0 }}>{t('nlNessuno')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--linea, #e2e6e1)' }}>
                <th style={th}>{t('nlThCanale')}</th>
                <th style={th}>{t('nlThPunto')}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('nlThAttivi')}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('nlThUltimi7')}</th>
              </tr>
            </thead>
            <tbody>
              {elenco.map((g) => (
                <tr key={`${g.canale}|${g.punto}`}>
                  <td style={td}>{t(`nlCanale_${g.canale}`)}</td>
                  <td style={td}>{t(`nlPunto_${g.punto}`)}</td>
                  <td style={tdR}>{g.totale}</td>
                  <td style={{ ...tdR, color: g.ultimi7 > 0 ? 'var(--verde, #1f9d55)' : 'var(--ink-soft, #6b7e8e)' }}>{g.ultimi7}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--ink-soft, #6b7e8e)', margin: '10px 0 0' }}>{t('nlLegendaProvenienza')}</p>
    </div>
  )
}
