import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AbbonatoClient from './AbbonatoClient'
import CouponBox from '@/app/components/CouponBox'
import { getGatingConfig } from '@/lib/gating'
import {
  getStripe, getAdmin, syncCheckoutSession, rigaValida, fineAccessoGratuito, trialEndValido,
} from '@/lib/stripeAbbonamenti'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

const DEFAULT_PREZZI = {
  allenatore: { mensile: '9.90', annuale: '79.00', lifetime: '199.00' },
  portiere:   { mensile: '4.90', annuale: '39.00', lifetime: '99.00' },
}

export default async function AbbonatiPage({ searchParams }) {
  const sp = (await searchParams) ?? {}
  const supabase = await createClient()
  const t = await getTranslations('abbonati')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const r = profilo?.ruolo
  if (r !== 'allenatore' && r !== 'staff' && r !== 'portiere') redirect('/')
  const isStaffCollaboratore = r === 'staff'
  const ruolo = r === 'portiere' ? 'portiere' : 'allenatore'

  const { tuttoFree } = await getGatingConfig(supabase)
  if (tuttoFree) redirect('/')

  const admin = getAdmin()

  // Ritorno da Stripe: attivo SUBITO leggendo la sessione, senza aspettare il
  // webhook (che resta comunque la fonte principale e rifà la stessa cosa).
  let attesaAttivazione = false
  if (sp.success && typeof sp.session_id === 'string' && sp.session_id.startsWith('cs_')) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sp.session_id)
      const esito = await syncCheckoutSession(admin, stripe, session, { userIdAtteso: user.id })
      if (!esito?.ok) attesaAttivazione = true
    } catch (e) {
      console.error('abbonati: sync ritorno checkout fallita', e?.message)
      attesaAttivazione = true
    }
  }

  // Stato attuale letto col client admin, filtrato sull'utente loggato.
  const { data: righe } = await admin.from('abbonamenti')
    .select('piano, stato, scadenza, created_at, stripe_customer_id, stripe_subscription_id')
    .eq('allenatore_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const riga = righe?.[0] ?? null

  const pagato = riga && riga.stato !== 'prova' && rigaValida(riga) ? riga : null
  const abbonamento = pagato ? {
    piano: pagato.piano,
    stato: pagato.stato,
    scadenza: pagato.scadenza,
    gestibile: !!pagato.stripe_customer_id,
  } : null
  if (abbonamento) attesaAttivazione = false

  // Accesso gratuito in corso (prova o coupon): avviso che abbonandosi ora non
  // si perdono i giorni rimasti. Stessa regola esatta del checkout.
  let provaScadenza = null
  if (!abbonamento && !isStaffCollaboratore) {
    try {
      const fine = await fineAccessoGratuito(admin, user.id, riga)
      provaScadenza = trialEndValido(fine) ? fine : null
    } catch (e) { console.error('abbonati: lettura accesso gratuito', e?.message) }
  }

  // Prezzi dal DB (chiavi: prezzo_{ruolo}_{piano})
  const chiavi = ['mensile', 'annuale', 'lifetime'].map((p) => `prezzo_${ruolo}_${p}`)
  const { data: prezziRows } = await supabase
    .from('funzionalita_config').select('chiave, label').in('chiave', chiavi)
  const prezziMap = {}
  for (const row of prezziRows ?? []) prezziMap[row.chiave] = row.label
  const prezzi = {
    mensile:  prezziMap[`prezzo_${ruolo}_mensile`]  ?? DEFAULT_PREZZI[ruolo].mensile,
    annuale:  prezziMap[`prezzo_${ruolo}_annuale`]  ?? DEFAULT_PREZZI[ruolo].annuale,
    lifetime: prezziMap[`prezzo_${ruolo}_lifetime`] ?? DEFAULT_PREZZI[ruolo].lifetime,
  }

  const { data: lifetimeRow } = await supabase
    .from('funzionalita_config').select('free').eq('chiave', `lifetime_attivo_${ruolo}`).maybeSingle()
  const lifetimeAttivo = lifetimeRow ? lifetimeRow.free !== false : true

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <AbbonatoClient
          abbonamento={abbonamento}
          prezzi={prezzi}
          ruolo={ruolo}
          lifetimeAttivo={lifetimeAttivo}
          isStaff={isStaffCollaboratore}
          attesaAttivazione={attesaAttivazione}
          annullato={!!sp.cancel}
          provaScadenza={provaScadenza}
        />
        {!abbonamento && !isStaffCollaboratore && <CouponBox />}
      </div>
    </>
  )
}
