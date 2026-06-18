import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import SidebarMobile from '@/app/components/SidebarMobile'
import { createClient } from '@/lib/supabase/server'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isStaff = false, isSupervisore = false, isPortiere = false
  let portiereId = null, societa = null, logo = null, stagioneNome = null
  let mostraAbbonati = false

  if (user) {
    const [{ data: profilo }, { data: stagione }] = await Promise.all([
      supabase.from('profili').select('ruolo, supervisore, portiere_id').eq('id', user.id).maybeSingle(),
      supabase.from('stagioni').select('nome, societa_nome, logo_url').eq('attiva', true).maybeSingle(),
    ])
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
    isSupervisore = profilo?.supervisore === true
    isPortiere = profilo?.ruolo === 'portiere'
    portiereId = profilo?.portiere_id ?? null
    societa = stagione?.societa_nome ?? null
    logo = stagione?.logo_url ?? null
    stagioneNome = stagione?.nome ?? null

    if (isStaff) {
      const { tuttoFree } = await getGatingConfig(supabase)
      const abbAttivo = await hasAbbonamento(supabase, user.id)
      mostraAbbonati = !tuttoFree && !abbAttivo
    }
  }

  const schedaHref = isPortiere && portiereId ? `/portieri/${portiereId}` : '/portieri'

  // Costruisce array voci per SidebarMobile
  const voci = [
    { href: schedaHref, label: isPortiere ? 'La mia scheda' : 'Portieri' },
    { href: '/calendario', label: 'Calendario' },
    ...(isStaff ? [{ href: '/ricorrenze', label: 'Ricorrenze' }] : []),
    { href: '/partite', label: 'Partite' },
    { href: '/statistiche', label: 'Statistiche' },
    ...(isStaff ? [{ href: '/esercizi', label: 'Esercizi' }] : []),
    ...(isStaff ? [{ href: '/profilo', label: 'Profilo allenatore' }] : []),
    ...(isStaff ? [{ href: '/inviti', label: 'Inviti' }] : []),
    { href: '/come-iniziare', label: 'Come iniziare' },
    { href: '/archivio', label: 'Archivio' },
    { href: '/suggerimenti', label: 'Suggerimenti' },
    ...(isSupervisore ? [{ href: '/supervisore', label: 'Supervisore' }] : []),
    ...(mostraAbbonati ? [{ href: '/abbonati', label: '🔓 Abbonati' }] : []),
    { type: 'divider', key: 'd1' },
    { href: '/', label: '↗ Vai al sito' },
    { type: 'signout', key: 'signout' },
  ]

  const brand = { href: schedaHref, logo, societa, stagioneNome }

  return (
    <div className="shell">
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <Link href={schedaHref} className="brand">
          {logo ? <img className="brand-logo" src={logo} alt="" /> : <div className="glove">GK</div>}
          <div>
            <b>GKT</b>
            {societa && <span>{societa}</span>}
            {stagioneNome && <span className="brand-stagione">Stagione {stagioneNome}</span>}
          </div>
        </Link>
        {isPortiere
          ? <NavLink href={schedaHref}>La mia scheda</NavLink>
          : <NavLink href="/portieri">Portieri</NavLink>}
        <NavLink href="/calendario">Calendario</NavLink>
        {isStaff && <NavLink href="/ricorrenze">Ricorrenze</NavLink>}
        <NavLink href="/partite">Partite</NavLink>
        <NavLink href="/statistiche">Statistiche</NavLink>
        {isStaff && <NavLink href="/esercizi">Esercizi</NavLink>}
        {isStaff && <NavLink href="/profilo">Profilo allenatore</NavLink>}
        {isStaff && <NavLink href="/inviti">Inviti</NavLink>}
        <NavLink href="/come-iniziare">Come iniziare</NavLink>
        <NavLink href="/archivio">Archivio</NavLink>
        <NavLink href="/suggerimenti">Suggerimenti</NavLink>
        {isSupervisore && <NavLink href="/supervisore">Supervisore</NavLink>}
        {mostraAbbonati && <NavLink href="/abbonati">🔓 Abbonati</NavLink>}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">↗ Vai al sito</Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Header mobile con hamburger */}
      <SidebarMobile voci={voci} brand={brand} />

      <main className="main">{children}</main>
    </div>
  )
}
