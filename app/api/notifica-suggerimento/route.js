import { NextResponse } from 'next/server'

// Notifica via email a support@gkseason.it quando arriva un nuovo suggerimento.
// Richiede la variabile d'ambiente RESEND_API_KEY (vedi .env.local.example).
// Se la chiave manca, la route risponde 200 senza inviare nulla: il form
// "Suggerimenti" continua a funzionare normalmente (il salvataggio su Supabase
// avviene comunque lato client, prima di chiamare questa route).

const RESEND_API_KEY = process.env.RESEND_API_KEY
const MITTENTE = 'GKSeason <notifiche@gkseason.it>'
const DESTINATARIO = 'supporto@gkseason.it'

export async function POST(req) {
  try {
    const { testo, categoria, nome, email } = await req.json()

    if (!testo?.trim()) {
      return NextResponse.json({ error: 'Testo mancante.' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      // Servizio non ancora configurato: non blocchiamo l'utente, logghiamo soltanto.
      console.warn('RESEND_API_KEY non impostata: notifica suggerimento non inviata.')
      return NextResponse.json({ ok: true, sent: false })
    }

    const mittenteInfo = nome || email
      ? `${nome?.trim() || 'Anonimo'}${email?.trim() ? ` (${email.trim()})` : ''}`
      : 'Utente registrato'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MITTENTE,
        to: DESTINATARIO,
        subject: `Nuovo suggerimento (${categoria || 'Altro'})`,
        html: `
          <p><strong>Categoria:</strong> ${categoria || 'Altro'}</p>
          <p><strong>Da:</strong> ${mittenteInfo}</p>
          <p><strong>Messaggio:</strong></p>
          <p>${(testo || '').replace(/\n/g, '<br />')}</p>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Errore invio Resend:', errText)
      return NextResponse.json({ ok: true, sent: false })
    }

    return NextResponse.json({ ok: true, sent: true })
  } catch (err) {
    console.error('Errore notifica suggerimento:', err)
    // Non facciamo fallire il flusso utente per un errore di notifica.
    return NextResponse.json({ ok: true, sent: false })
  }
}