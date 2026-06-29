import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica che il richiedente sia un allenatore
  const { data: profiloMio } = await supabase
    .from('profili').select('ruolo, nome_completo').eq('id', user.id).maybeSingle()
  if (profiloMio?.ruolo !== 'allenatore') redirect('/')

  const admin = getAdmin()

  // Verifica relazione attiva supervisore → preparatore
  const { data: relazione } = await admin
    .from('relazioni_supervisione')
    .select('id')
    .eq('supervisore_id', user.id)
    .eq('preparatore_id', preparatoreId)
    .eq('attivo', true)
    .maybeSingle()

  if (!relazione) notFound()

  // Carica profilo e stagione attiva del preparatore
  const { data: profiloPre } = await admin
    .from('profili').select('nome_completo, foto_url').eq('id', preparatoreId).maybeSingle()

  const { data: stagionePre } = await admin
    .from('stagioni')
    .select('id, nome, societa_nome, logo_url')
    .eq('owner_id', preparatoreId)
    .eq('attiva', true)
    .maybeSingle()

  const nomePre = profiloPre?.nome_completo ?? 'Preparatore'
  const base = `/supervisore/preparatore/${preparatoreId}`

  const voci = [
    { href: `${base}`, label: '🏠 Panoramica' },
    { href: `${base}/portieri`, label: 'Portieri' },
    { href: `${base}/calendario`, label: 'Calendario' },
    { href: `${base}/partite`, label: 'Partite' },
    { href: `${base}/statistiche`, label: 'Statistiche' },
    { href: `${base}/esercizi`, label: 'Esercizi' },
  ]

  const brand = {
    href: base,
    logo: stagionePre?.logo_url ?? profiloPre?.foto_url ?? null,
    societa: stagionePre?.societa_nome ?? null,
    stagioneNome: stagionePre?.nome ?? null,
  }

  return (
    <div className="shell">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <Link href={base} className="brand">
          {brand.logo
            ? <img className="brand-logo" src={brand.logo} alt="" />
            : <div className="glove" style={{ background: 'var(--azzurro)', color: '#fff', fontSize: 12 }}>👁</div>
          }
          <div>
            <b style={{ fontSize: 13 }}>{nomePre}</b>
            {brand.societa && <span>{brand.societa}</span>}
            {brand.stagioneNome && <span className="brand-stagione">Stagione {brand.stagioneNome}</span>}
          </div>
        </Link>

        {/* Banner supervisione */}
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
          👁 Modalità supervisione
        </div>

        {voci.map(v => (
          <NavLink key={v.href} href={v.href}>{v.label}</NavLink>
        ))}

        <div className="sidebar-foot">
          <Link href="/i-miei-preparatori" className="nav-link nav-sito">← I miei preparatori</Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Header mobile */}
      <SidebarMobile voci={[...voci, { href: '/i-miei-preparatori', label: '← I miei preparatori' }]} brand={brand} />

      <div className="main-col">
        {/* Banner top sola lettura */}
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
          <span>Stai visualizzando l&apos;area di <strong>{nomePre}</strong> in modalità supervisione — sola lettura</span>
          <Link href="/i-miei-preparatori" style={{ marginLeft: 'auto', color: 'var(--azzurro)', fontSize: 12 }}>
            ← Torna alla lista
          </Link>
        </div>

        <main className="main">{children}</main>

        <footer className="app-foot">
          <a href="/privacy-policy">Privacy</a>
          <span>·</span>
          <a href="/cookie-policy">Cookie</a>
        </footer>
      </div>

      {/* Pannello commenti flottante */}
      <PannelloCommenti preparatoreId={preparatoreId} contesto={null} />
    </div>
  )
}
