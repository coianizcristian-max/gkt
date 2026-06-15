import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'

export default function AppLayout({ children }) {
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
        <div className="sidebar-foot">
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
