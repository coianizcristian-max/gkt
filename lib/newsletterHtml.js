// Render della newsletter come HTML per l'email (stili inline, coerenti con
// NewsletterRender del sito). unsubUrl = link personale di disiscrizione.
function esc(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Titolo -> identificativo campagna leggibile: "Le tue statistiche" -> le-tue-statistiche */
function slug(t) {
  return String(t ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // via gli accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'newsletter'
}

/**
 * Aggiunge i parametri di tracciamento a un link della newsletter.
 *
 * Senza questi, in PostHog tutti i click dalle email si confondono con il
 * traffico diretto e non si sa quale newsletter (ne' quale link dentro di
 * essa) abbia portato la gente.
 *
 * - utm_source  = newsletter
 * - utm_medium  = email
 * - utm_campaign= titolo della newsletter, in forma leggibile
 * - utm_content = posizione del link nell'email (1 = il primo in alto)
 *
 * Non tocca i parametri che hai gia' messo a mano: se scrivi tu un
 * utm_campaign diverso, vince il tuo.
 */
function conTracciamento(url, campagna, posizione) {
  try {
    const u = new URL(url)
    if (!u.protocol.startsWith('http')) return url
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'newsletter')
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'email')
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campagna)
    if (!u.searchParams.has('utm_content')) u.searchParams.set('utm_content', `link-${posizione}`)
    return u.toString()
  } catch {
    // link relativo o malformato: lo lasciamo esattamente com'e'
    return url
  }
}

export function newsletterHtml({ titolo, sezioni, dataStr, societa = 'GKSeason', unsubUrl = '#', logoUrl = '' }) {
  const campagna = slug(titolo)
  let nLink = 0
  const body = (sezioni ?? []).map((s) => {
    if (s.tipo === 'titolo') {
      return `<h2 style="font-size:18px;font-weight:700;color:#0a5a8a;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e8f0f8;">${esc(s.testo || '')}</h2>`
    }
    if (s.tipo === 'separatore') {
      return `<hr style="border:none;border-top:1px solid #e8f0f8;margin:24px 0;" />`
    }
    if (s.tipo === 'foto') {
      if (!s.foto_url) return ''
      const cap = s.testo
        ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7e8e;text-align:center;font-style:italic;">${esc(s.testo)}</p>`
        : ''
      const img = `<img src="${esc(s.foto_url)}" alt="${esc(s.testo || '')}" style="width:100%;border-radius:8px;display:block;max-height:340px;object-fit:cover;border:0;" />`
      const media = s.link_url
        ? `<a href="${esc(conTracciamento(s.link_url, campagna, ++nLink))}" target="_blank" style="display:block;text-decoration:none;">${img}</a>`
        : img
      return `<div style="margin:20px 0;">${media}${cap}</div>`
    }
    // testo (default)
    const paras = (s.testo || '').split('\n')
      .map((r) => r.trim() === '' ? '<br/>' : `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#2a3b47;">${esc(r)}</p>`)
      .join('')
    return `<div style="margin:14px 0;">${paras}</div>`
  }).join('')

  return `<!doctype html><html><body style="margin:0;padding:24px 0;background:#eef2f5;">
  <div style="max-width:580px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
      <tr>
        <td bgcolor="#0a5a8a" style="background-color:#0a5a8a;background-image:linear-gradient(135deg,#0a5a8a 0%,#0a7ec2 100%);padding:32px 36px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="vertical-align:top;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#cfe4f2;margin-bottom:8px;">${esc(societa)} &middot; Newsletter</div>
              <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.25;color:#ffffff;">${esc(titolo || '')}</h1>
              ${dataStr ? `<div style="margin-top:10px;font-size:13px;color:#bcd6ea;">${esc(dataStr)}</div>` : ''}
            </td>
            ${logoUrl ? `<td width="64" align="right" style="vertical-align:top;text-align:right;"><img src="${esc(logoUrl)}" width="56" alt="GKSeason" style="display:block;border:0;height:auto;" /></td>` : ''}
          </tr></table>
        </td>
      </tr>
    </table>
    <div style="padding:28px 36px;">${body}</div>
    <div style="background:#f6f8fa;border-top:1px solid #e8f0f8;padding:16px 36px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8899a8;line-height:1.6;">
        Hai ricevuto questa email perch&eacute; sei iscritto alla newsletter di ${esc(societa)}.<br/>
        <a href="${esc(unsubUrl)}" style="color:#8899a8;">Disiscriviti</a>
      </p>
    </div>
  </div></body></html>`
}
