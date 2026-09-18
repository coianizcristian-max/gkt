// Mail di benvenuto per chi si iscrive alla newsletter dal popup della demo.
// Stesso stile della newsletter (lib/newsletterHtml.js): intestazione blu con
// logo, stili inline e layout a tabelle, cosi' regge anche Outlook e Gmail.
// Le immagini sono file PNG/JPG pubblici del sito: gli SVG in email non si
// vedono.

const FEATURE = [
  { icona: '📅', t: 'nlBvF1T', d: 'nlBvF1' },
  { icona: '⭐', t: 'nlBvF2T', d: 'nlBvF2' },
  { icona: '🎯', t: 'nlBvF3T', d: 'nlBvF3' },
  { icona: '📊', t: 'nlBvF4T', d: 'nlBvF4' },
]

/**
 * @param m      mailTexts(req): testi nella lingua del visitatore
 * @param links  { registrati, demo, unsub, sito }
 */
export function benvenutoNewsletterHtml({ m, links, siteUrl }) {
  const logo = `${siteUrl}/gk_circle_white.png`
  const hero = `${siteUrl}/email/benvenuto-hero.jpg`

  const righe = FEATURE.map((f) => `
            <tr>
              <td width="44" valign="top" style="padding:0 0 18px;">
                <div style="width:36px;height:36px;line-height:36px;text-align:center;font-size:18px;background:#e8f2fa;border-radius:10px;">${f.icona}</div>
              </td>
              <td valign="top" style="padding:0 0 18px 8px;">
                <div style="font-size:15px;font-weight:700;color:#0a5a8a;margin:0 0 2px;">${m(f.t)}</div>
                <div style="font-size:14px;line-height:1.55;color:#4a5d6b;">${m(f.d)}</div>
              </td>
            </tr>`).join('')

  return `<!doctype html><html lang="${m.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m('nlBvSubject')}</title></head>
<body style="margin:0;padding:0;background:#eef2f5;">
  <div style="display:none;max-height:0;overflow:hidden;color:#eef2f5;">${m('nlBvPreheader')}</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef2f5;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- intestazione -->
        <tr>
          <td bgcolor="#0a5a8a" style="background-color:#0a5a8a;background-image:linear-gradient(135deg,#0a5a8a 0%,#0a7ec2 100%);padding:28px 32px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td valign="middle">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#cfe4f2;margin-bottom:8px;">${m('nlEyebrow')}</div>
                <h1 style="margin:0;font-size:25px;font-weight:800;line-height:1.25;color:#ffffff;">${m('nlBvTitolo')}</h1>
              </td>
              <td width="64" align="right" valign="middle"><img src="${logo}" width="56" alt="GKSeason" style="display:block;border:0;height:auto;" /></td>
            </tr></table>
          </td>
        </tr>

        <!-- immagine -->
        <tr>
          <td style="padding:0;line-height:0;">
            <a href="${links.demo}" target="_blank" style="display:block;text-decoration:none;">
              <img src="${hero}" width="580" alt="GKSeason" style="display:block;width:100%;max-width:580px;height:auto;border:0;" />
            </a>
          </td>
        </tr>

        <!-- testo -->
        <tr>
          <td style="padding:28px 32px 8px;color:#2a3b47;font-size:15px;line-height:1.7;">
            <p style="margin:0;">${m('nlBvTesto')}</p>
          </td>
        </tr>

        <!-- cosa puoi fare -->
        <tr>
          <td style="padding:18px 32px 4px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8899a8;margin:0 0 16px;">${m('nlBvFeatTitolo')}</div>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${righe}
            </table>
          </td>
        </tr>

        <!-- invito all'account -->
        <tr>
          <td style="padding:4px 32px 30px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f8fc;border:1px solid #d9e9f5;border-radius:12px;">
              <tr><td align="center" style="padding:24px 22px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#2a3b47;">${m('nlBvInvito')}</p>
                <a href="${links.registrati}" target="_blank" style="display:inline-block;background:#0a7ec2;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700;font-size:15px;">${m('nlBvBottone')}</a>
                <div style="margin-top:14px;font-size:14px;"><a href="${links.demo}" target="_blank" style="color:#0a7ec2;">${m('nlBvDemo')} &rarr;</a></div>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- piede -->
        <tr>
          <td style="background:#f6f8fa;border-top:1px solid #e8f0f8;padding:18px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#8899a8;line-height:1.6;">${m('nlBvFooter')}</p>
            <p style="margin:0;font-size:12px;color:#8899a8;line-height:1.6;">${m('nlBvDisclaimer')} <a href="${links.unsub}" style="color:#8899a8;">${m('nlBvDisiscrivi')}</a></p>
            <p style="margin:10px 0 0;font-size:11px;"><a href="${links.sito}" style="color:#aab7c2;text-decoration:none;">gkseason.it</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}
