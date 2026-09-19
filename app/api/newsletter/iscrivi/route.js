import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { mailTexts, tApi } from '@/lib/i18nServer'
import { inviaConferma, inviaBenvenuto, salvaConsenso, pulisciFonte } from '@/lib/newsletterMail'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ORIGINI = ['demo']

/**
 * Registra l'iscrizione. Due modalita':
 *  - standard (form del sito): riga inattiva + email di conferma (doppio opt-in)
 *  - immediata (popup della demo da /d): il consenso e' l'atto del visitatore
 *    che scrive l'email e preme il pulsante con l'informativa sotto al campo;
 *    la riga nasce gia' attiva e si registrano data e origine del consenso.
 */
export async function POST(req) {
  try {
    const m = mailTexts(req)
    const { email, immediata, origine, fonte: fonteGrezza } = await req.json()
    // Fonte di arrivo (utm_source, meta_ads, social_meta...) per le metriche.
    const fonte = pulisciFonte(fonteGrezza)
    const em = (email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(em)) return NextResponse.json({ error: tApi(req, 'Email non valida.') }, { status: 400 })

    const { data: esistente } = await admin.from('newsletter_iscritti')
      .select('id, attivo').eq('email', em).maybeSingle()

    // Già iscritto e attivo: non facciamo nulla (niente downgrade, niente email).
    if (esistente?.attivo) return NextResponse.json({ ok: true, stato: 'gia_iscritto' })

    if (immediata === true) {
      const consenso = {
        attivo: true,
        consenso_il: new Date().toISOString(),
        origine: ORIGINI.includes(origine) ? origine : 'demo',
        ...(fonte ? { fonte } : {}),
      }
      let id = esistente?.id
      if (!id) {
        const { data: nuovo, error } = await admin.from('newsletter_iscritti')
          .insert({ email: em, attivo: true }).select('id').single()
        if (error) throw error
        id = nuovo.id
      }
      await salvaConsenso(admin, id, consenso)
      // Qui si arriva solo se NON era gia' iscritto e attivo (quel caso esce
      // prima): la mail parte una volta sola per persona.
      try { await inviaBenvenuto(em, id, m) } catch (e) { console.error('[newsletter/iscrivi] benvenuto', e) }
      return NextResponse.json({ ok: true, stato: 'iscritto' })
    }

    // Esiste ma non confermato -> rimandiamo la conferma; non esiste -> lo creiamo inattivo.
    let id = esistente?.id
    if (!id) {
      const { data: nuovo, error } = await admin.from('newsletter_iscritti')
        .insert({ email: em, attivo: false }).select('id').single()
      if (error) throw error
      id = nuovo.id
    }
    // La fonte si salva gia' qui: alla conferma (altra richiesta, dalla mail)
    // l'informazione non sarebbe piu' disponibile. Se la colonna non esiste
    // ancora, si ignora l'errore.
    if (fonte) await admin.from('newsletter_iscritti').update({ fonte }).eq('id', id)
    await inviaConferma(em, id, m)
    return NextResponse.json({ ok: true, stato: 'conferma_inviata' })
  } catch (err) {
    console.error('[newsletter/iscrivi]', err)
    return NextResponse.json({ error: tApi(req, 'Errore interno.') }, { status: 500 })
  }
}
