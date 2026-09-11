import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import SidebarMobile from '@/app/components/SidebarMobile'
import PannelloCommenti from '@/app/components/PannelloCommenti'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function SupervisioneLayout({ children, params }) {
  const { id: preparatoreId } = await params
  const t = await getTranslations('supervisionePrep')
  const c = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiloMio } = await supabase
    .from('profili').select('ruolo, nome_completo').eq('id', user.id).maybeSingle()
  if (profiloMio?.ruolo !== 'allenatore') redirect('/')

  const admin = getAdmin()

  const { data: relazione } = await admin
    .from('relazioni_supervisione')
    .select('id')
    .eq('supervisore_id', user.id)
    .eq('preparatore_id', preparatoreId)
    .eq('attivo', true)
    .maybeSingle()

  if (!relazione) notFound()

  const { data: profiloPre } = await admin
    .from('profili').select('nome_completo, foto_url').eq('id', preparatoreId).maybeSingle()

  const { data: stagionePre } = await admin
    .from('stagioni')
    .select('id, nome, societa_nome, logo_url')
    .eq('owner_id', preparatoreId)
    .eq('attiva', true)
    .maybeSingle()

  const nomePre = profiloPre?.nome_completo ?? t('preparatore')
  const base = `/supervisore/preparatore/${preparatoreId}`

  const voci = [
    { href: `${base}`, label: t('panoramica') },
    { href: `${base}/portieri`, label: t('portieri') },
    { href: `${base}/calendario`, label: t('calendario') },
    { href: `${base}/partite`, label: t('partite') },
    { href: `${base}/statistiche`, label: t('statistiche') },
    { href: `${base}/esercizi`, label: t('esercizi') },
  ]

  const brand = {
    href: base,
    logo: stagionePre?.logo_url ?? profiloPre?.foto_url ?? null,
    societa: stagionePre?.societa_nome ?? null,
    stagioneNome: stagionePre?.nome ?? null,
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href={base} className="brand">
          {brand.logo
            ? <img className="brand-logo" src={brand.logo} alt="" />
            : <div className="glove" style={{ background: 'var(--azzurro)', color: '#fff', fontSize: 12 }}>👁</div>
          }
          <div>
            <b style={{ fontSize: 13 }}>{nomePre}</b>
            {brand.societa && <span>{brand.societa}</span>}
            {brand.stagioneNome && <span className="brand-stagione">{c('stagione', { nome: brand.stagioneNome })}</span>}
          </div>
        </Link>

        <div style={{
          margin: '4px 8px 8px',
          padding: '6px 10px',
          background: 'rgba(10,126,194,0.10)',
          borderRadius: 'var(--r-sm)',
          fontSize: 11,
          color: 'var(--azzurro)',
          fontWeight: 600,
          lineHeight: 1.3,
        }}>
          {t('modalitaSupervisione')}
        </div>

        {voci.map(v => (
          <NavLink key={v.href} href={v.href}>{v.label}</NavLink>
        ))}

        <div className="sidebar-foot">
          <Link href="/i-miei-preparatori" className="nav-link nav-sito">{t('mieiPreparatori')}</Link>
          <SignOutButton />
        </div>
      </aside>

      <SidebarMobile voci={[...voci, { href: '/i-miei-preparatori', label: t('mieiPreparatori') }]} brand={brand} />

      <div className="main-col">
        <div style={{
          background: 'rgba(10,126,194,0.06)',
          borderBottom: '1px solid rgba(10,126,194,0.15)',
          padding: '8px 24px',
          fontSize: 12,
          color: 'var(--azzurro)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>👁</span>
          <span>{t.rich('bannerSolaLettura', { nome: nomePre, b: (ch) => <strong>{ch}</strong> })}</span>
          <Link href="/i-miei-preparatori" style={{ marginLeft: 'auto', color: 'var(--azzurro)', fontSize: 12 }}>
            {t('tornaLista')}
          </Link>
        </div>

        <main className="main">{children}</main>

        <footer className="app-foot">
          <a href="/privacy-policy">{t('privacy')}</a>
          <span>·</span>
          <a href="/cookie-policy">{t('cookie')}</a>
        </footer>
      </div>

      <PannelloCommenti preparatoreId={preparatoreId} contesto={null} />
    </div>
  )
}
