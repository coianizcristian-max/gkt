// Mail di conferma iscrizione (doppio opt-in) dal form della home.
// Stessa intestazione della newsletter e della mail di benvenuto, ma
// essenziale di proposito: un solo pulsante, niente immagini grandi.

export function confermaNewsletterHtml({ m, siteUrl, link }) {
  const logo = `${siteUrl}/gk_circle_white.png`
  return `<!doctype html><html lang="${m.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m('nlSubject')}</title></head>
<body style="margin:0;padding:0;background:#eef2f5;">
  <div style="display:none;max-height:0;overflow:hidden;color:#eef2f5;">${m('nlPreheader')}</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef2f5;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <tr>
          <td bgcolor="#0a5a8a" style="background-color:#0a5a8a;background-image:linear-gradient(135deg,#0a5a8a 0%,#0a7ec2 100%);padding:28px 32px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
              <td valign="middle">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#cfe4f2;margin-bottom:8px;">${m('nlEyebrow')}</div>
                <h1 style="margin:0;font-size:24px;font-weight:800;line-height:1.25;color:#ffffff;">${m('nlTitolo')}</h1>
              </td>
              <td width="64" align="right" valign="middle"><img src="${logo}" width="56" alt="GKSeason" style="display:block;border:0;height:auto;" /></td>
            </tr></table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:32px 32px 10px;color:#2a3b47;font-size:15px;line-height:1.7;">
            <p style="margin:0 0 24px;">${m('nlTesto')}</p>
            <a href="${link}" target="_blank" style="display:inline-block;background:#0a7ec2;color:#ffffff;text-decoration:none;padding:15px 34px;border-radius:9px;font-weight:700;font-size:16px;">${m('nlBottone')}</a>
            <p style="margin:22px 0 0;font-size:12.5px;color:#8899a8;line-height:1.6;">${m('nlLinkAlternativo')}<br/>
              <a href="${link}" target="_blank" style="color:#0a7ec2;word-break:break-all;">${link}</a></p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0;"><div style="border-top:1px solid #e8f0f8;"></div></td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 32px 24px;">
            <p style="margin:0;font-size:12px;color:#8899a8;line-height:1.6;">${m('nlDisclaimer')}</p>
            <p style="margin:10px 0 0;font-size:11px;"><a href="${siteUrl}" style="color:#aab7c2;text-decoration:none;">gkseason.it</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}
