import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req) {
  try {
    const { allenatoreId, nome, email, telefono, societa, messaggio } = await req.json()

    // Validazione base
    if (!allenatoreId || !nome?.trim() || !email?.trim() || !messaggio?.trim()) {
      return NextResponse.json({ error: 'Dati mancanti.' }, { status: 400 })
    }
    if (messaggio.trim().length < 20) {
      return NextResponse.json({ error: 'Il messaggio è troppo breve (minimo 20 caratteri).' }, { status: 400 })
    }

    // Verifica che l'allenatore esista e sia disponibile
    const { data: profilo } = await admin.from('profili')
      .select('nome_completo, disponibile').eq('id', allenatoreId).maybeSingle()
    if (!profilo) return NextResponse.json({ error: 'Allenatore non trovato.' }, { status: 404 })
    if (!profilo.disponibile) return NextResponse.json({ error: 'Allenatore non disponibile.' }, { status: 400 })

    // Recupera email allenatore da auth.users (mai esposta pubblicamente)
    const { data: authUser } = await admin.auth.admin.getUserById(allenatoreId)
    const emailAllenatore = authUser?.user?.email

    // Salva il messaggio nel DB
    const { error: insertErr } = await admin.from('messaggi_contatto').insert({
      allenatore_id: allenatoreId,
      nome_mittente: nome.trim(),
      email_mittente: email.trim(),
      telefono_mittente: telefono?.trim() || null,
      societa: societa?.trim() || null,
      messaggio: messaggio.trim(),
    })
    if (insertErr) throw new Error(insertErr.message)

    // Invia email all'allenatore (se ha email registrata)
    // Nota: usa Supabase Auth email (configurata tramite SMTP custom nel progetto)
    if (emailAllenatore) {
      await admin.auth.admin.inviteUserByEmail
      // Supabase non ha un API di invio email custom diretto — usiamo fetch verso
      // un eventuale SMTP esterno o semplicemente logghiamo l'intenzione.
      // Per ora salviamo nel DB (che è già fatto sopra) e aggiungiamo un campo
      // email_da_inviare che un cron/trigger esterno può processare.
      // TODO: integrare Resend/Postmark/SendGrid quando l'SMTP custom è configurato.
      // L'allenatore vede i messaggi nell'area riservata → sezione "Contatti ricevuti".
      console.log(`[invia-contatto] Nuovo messaggio per ${profilo.nome_completo} <${emailAllenatore}> da ${nome} <${email}>`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[invia-contatto]', err)
    return NextResponse.json({ error: 'Errore interno. Riprova.' }, { status: 500 })
  }
}
