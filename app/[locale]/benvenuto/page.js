import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
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

  // REGOLA UNICA PER GLI INVITI: chi arriva da un invito passa SEMPRE dal
  // login, senza eccezioni. Due motivi:
  //  1. la presenza di una sessione non dimostra che sia dell'utente appena
  //     confermato — se il link si apre in un browser dove e' loggato qualcun
  //     altro (tipico: l'allenatore che prova il proprio invito), mandarlo
  //     "alla sua area" lo porta nell'account SBAGLIATO;
  //  2. un comportamento solo, sempre uguale, e' spiegabile in una frase e fa
  //     passare il collegamento sempre per lo stesso identico punto.
  const invitoDaCollegare = !!token
  const loggato = !!user && !token

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
