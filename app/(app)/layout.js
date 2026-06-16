import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isStaff = false
  if (user) {
    const { data: profilo } = await supabase
      .from('profili').select('ruolo').eq('id', user.id).maybeSingle()
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="glove">GK</div>
          <div>
            <b>GKT</b>
            <span>Azzurra Sandrigo</span>
          </div>
        </div>
        <NavLink href="/portieri">Portieri</NavLink>
        <NavLink href="/calendario">Calendario</NavLink>
        <NavLink href="/partite">Partite</NavLink>
        <NavLink href="/statistiche">Statistiche</NavLink>
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
