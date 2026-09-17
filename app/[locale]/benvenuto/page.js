import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('benvenuto')
  return { title: t('metaTitle') }
}
export const dynamic = 'force-dynamic'

export default async function BenvenutoPage({ searchParams }) {
  const params = await searchParams
  const token = params?.invito ?? null

  const supabase = await createClient()
  const t = await getTranslations('benvenuto')
  const { data: { user } } = await supabase.auth.getUser()

  // ATTENZIONE: la presenza di una sessione NON significa che sia dell'utente
  // che ha appena confermato l'email. Se il link di conferma viene aperto in un
  // browser dove e' gia' loggato qualcun altro (tipico: l'allenatore che prova
  // il proprio invito, o un familiare), mandarlo "alla sua area" lo porta
  // nell'account SBAGLIATO. Con un invito in corso ci fidiamo solo della prova
  // certa: l'invito risulta consumato proprio da chi e' loggato ora.
  let loggato = !!user
  let invitoDaCollegare = false

  if (token) {
    loggato = false
    if (user) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: invito } = await admin
        .from('inviti')
        .select('consumato_da')
        .eq('token', token)
        .maybeSingle()
      loggato = invito?.consumato_da === user.id
    }
    // Invito ancora da agganciare: il passaggio dal login non e' un ostacolo,
    // e' il punto in cui il collegamento avviene davvero. Lo diciamo chiaro,
    // cosi' l'utente capisce perche' deve fare un passo in piu'.
    invitoDaCollegare = !loggato
  }

  // Se l'invito non risulta ancora collegato, il login e' il passo che lo
  // completa: gli passiamo il token, cosi' scatta al primo accesso.
  const href = loggato
    ? '/dashboard'
    : token
      ? `/login?invito=${encodeURIComponent(token)}`
      : '/login'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--landing-blue-deep, #0d2137)', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 36px', maxWidth: 440, width: '100%',
        textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.25)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>✅</div>
        <h1 style={{ fontSize: 26, margin: '0 0 12px', color: '#0d2137' }}>{t('titolo')}</h1>
        <p style={{ color: '#5a7080', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          {t('intro')}
          {loggato ? t('prontoLoggato') : invitoDaCollegare ? t('prontoInvito') : t('prontoNonLoggato')}
        </p>
        <Link href={href} className="btn" style={{
          display: 'inline-block', background: '#0a7ec2', color: '#fff', padding: '13px 28px',
          borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 15,
        }}>
          {loggato ? t('ctaLoggato') : invitoDaCollegare ? t('ctaInvito') : t('ctaNonLoggato')}
        </Link>
      </div>
    </div>
  )
}
