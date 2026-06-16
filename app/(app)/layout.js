import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isStaff = false
  let societa = null
  let logo = null
  if (user) {
    const [{ data: profilo }, { data: stagione }] = await Promise.all([
      supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle(),
      supabase.from('stagioni').select('societa_nome, logo_url').eq('attiva', true).maybeSingle(),
    ])
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
    societa = stagione?.societa_nome ?? null
    logo = stagione?.logo_url ?? null
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {logo ? <img className="brand-logo" src={logo} alt="" /> : <div className="glove">GK</div>}
          <div>
            <b>GKT</b>
            {societa && <span>{societa}</span>}
          </div>
        </div>
        <NavLink href="/portieri">Portieri</NavLink>
        <NavLink href="/calendario">Calendario</NavLink>
        <NavLink href="/partite">Partite</NavLink>
        <NavLink href="/statistiche">Statistiche</NavLink>
        <NavLink href="/suggerimenti">Suggerimenti</NavLink>
        {isStaff && <NavLink href="/supervisore">Supervisore</NavLink>}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">↗ Vai al sito</Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
