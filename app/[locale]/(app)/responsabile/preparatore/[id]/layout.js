import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Link } from '@/i18n/routing'
import PannelloCommenti from '@/app/components/PannelloCommenti'
import { getTranslations } from 'next-intl/server'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function SupervisioneLayout({ children, params }) {
  const { id: preparatoreId } = await params

  const supabase = await createClient()
  const t = await getTranslations('supervisione')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiloMio } = await supabase
    .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (profiloMio?.ruolo !== 'allenatore') redirect('/')

  const admin = getAdmin()

  // Verifica relazione attiva
  const { data: relazione } = await admin
    .from('relazioni_supervisione')
    .select('id')
    .eq('supervisore_id', user.id)
    .eq('preparatore_id', preparatoreId)
    .eq('attivo', true)
    .maybeSingle()

  if (!relazione) notFound()

  const { data: profiloPre } = await admin
    .from('profili').select('nome_completo').eq('id', preparatoreId).maybeSingle()

  const nomePre = profiloPre?.nome_completo ?? t('preparatoreFallback')
  const base = `/responsabile/preparatore/${preparatoreId}`

  const sezioni = [
    { href: base, label: '🏠' },
    { href: `${base}/portieri`, label: t('navPortieri') },
    { href: `${base}/calendario`, label: t('navCalendario') },
    { href: `${base}/partite`, label: t('navPartite') },
    { href: `${base}/statistiche`, label: t('navStatistiche') },
    { href: `${base}/esercizi`, label: t('navEsercizi') },
    { href: `${base}/template-allenamenti`, label: t('navTemplate') },
  ]

  return (
    <>
      {/* Banner supervisione + nav orizzontale */}
      <div style={{
        background: 'rgba(10,126,194,0.06)',
        borderBottom: '1px solid rgba(10,126,194,0.15)',
        padding: '8px 16px',
        fontSize: 12,
        color: 'var(--azzurro)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span>{t.rich('banner', { nome: nomePre, b: (ch) => <strong>{ch}</strong> })}</span>
          <Link href="/i-miei-preparatori" style={{ marginLeft: 'auto', color: 'var(--azzurro)', fontSize: 12 }}>{t('tornaLista')}</Link>
        </div>
        {/* Nav sezioni */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sezioni.map(s => (
            <Link
              key={s.href}
              href={s.href}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--azzurro)',
                background: 'rgba(10,126,194,0.10)',
                textDecoration: 'none',
                border: '1px solid rgba(10,126,194,0.2)',
              }}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Contenuto pagina */}
      {children}

      {/* Pannello commenti flottante */}
      <PannelloCommenti preparatoreId={preparatoreId} contesto={null} />
    </>
  )
}
