import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isStaff = false
  let isSupervisore = false
  let societa = null
  let logo = null
  let stagioneNome = null
  if (user) {
    const [{ data: profilo }, { data: stagione }] = await Promise.all([
      supabase.from('profili').select('ruolo, supervisore').eq('id', user.id).maybeSingle(),
      supabase.from('stagioni').select('nome, societa_nome, logo_url').eq('attiva', true).maybeSingle(),
    ])
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
    isSupervisore = profilo?.supervisore === true
    societa = stagione?.societa_nome ?? null
    logo = stagione?.logo_url ?? null
    stagioneNome = stagione?.nome ?? null
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/portieri" className="brand">
          {logo ? <img className="brand-logo" src={logo} alt="" /> : <div className="glove">GK</div>}
          <div>
            <b>GKT</b>
            {societa && <span>{societa}</span>}
            {stagioneNome && <span className="brand-stagione">Stagione {stagioneNome}</span>}
          </div>
        </Link>
        <NavLink href="/portieri">Portieri</NavLink>
        <NavLink href="/calendario">Calendario</NavLink>
        {isStaff && <NavLink href="/ricorrenze">Ricorrenze</NavLink>}
        <NavLink href="/partite">Partite</NavLink>
        <NavLink href="/statistiche">Statistiche</NavLink>
        {isStaff && <NavLink href="/esercizi">Esercizi</NavLink>}
        {isStaff && <NavLink href="/profilo">Profilo allenatore</NavLink>}
        {isStaff && <NavLink href="/inviti">Inviti</NavLink>}
        <NavLink href="/archivio">Archivio</NavLink>
        <NavLink href="/suggerimenti">Suggerimenti</NavLink>
        {isSupervisore && <NavLink href="/supervisore">Supervisore</NavLink>}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">↗ Vai al sito</Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
