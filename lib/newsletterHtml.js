// Render della newsletter come HTML per l'email (stili inline, coerenti con
// NewsletterRender del sito). unsubUrl = link personale di disiscrizione.
function esc(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function newsletterHtml({ titolo, sezioni, dataStr, societa = 'GKSeason', unsubUrl = '#', logoUrl = '' }) {
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
      return `<div style="margin:20px 0;"><img src="${esc(s.foto_url)}" alt="${esc(s.testo || '')}" style="width:100%;border-radius:8px;display:block;max-height:340px;object-fit:cover;" />${cap}</div>`
    }
    // testo (default)
    const paras = (s.testo || '').split('\n')
      .map((r) => r.trim() === '' ? '<br/>' : `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#2a3b47;">${esc(r)}</p>`)
      .join('')
    return `<div style="margin:14px 0;">${paras}</div>`
  }).join('')

  return `<!doctype html><html><body style="margin:0;padding:24px 0;background:#eef2f5;">
  <div style="max-width:580px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    <div style="background:linear-gradient(135deg,#0a5a8a 0%,#0a7ec2 100%);padding:32px 36px 24px;color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="vertical-align:top;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;margin-bottom:8px;">${esc(societa)} &middot; Newsletter</div>
          <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.25;">${esc(titolo || '')}</h1>
          ${dataStr ? `<div style="margin-top:10px;font-size:13px;opacity:0.75;">${esc(dataStr)}</div>` : ''}
        </td>
        ${logoUrl ? `<td width="64" style="vertical-align:top;text-align:right;"><img src="${esc(logoUrl)}" width="56" alt="GKSeason" style="display:block;border:0;height:auto;" /></td>` : ''}
      </tr></table>
    </div>
    <div style="padding:28px 36px;">${body}</div>
    <div style="background:#f6f8fa;border-top:1px solid #e8f0f8;padding:16px 36px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8899a8;line-height:1.6;">
        Hai ricevuto questa email perch&eacute; sei iscritto alla newsletter di ${esc(societa)}.<br/>
        <a href="${esc(unsubUrl)}" style="color:#8899a8;">Disiscriviti</a>
      </p>
    </div>
  </div></body></html>`
}
