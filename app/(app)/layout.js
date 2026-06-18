import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isStaff = false
  let isSupervisore = false
  let isPortiere = false
  let portiereId = null
  let societa = null
  let logo = null
  let stagioneNome = null
  let mostraAbbonati = false
  let abbonamentoAttivo = false

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
      abbonamentoAttivo = await hasAbbonamento(supabase, user.id)
      // Mostra "Abbonati" solo se TUTTO FREE è off e l'allenatore non ha già abbonamento attivo
      mostraAbbonati = !tuttoFree && !abbonamentoAttivo
    }
  }

  const schedaHref = isPortiere && portiereId ? `/portieri/${portiereId}` : '/portieri'

  return (
    <div className="shell">
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
        {mostraAbbonati && (
          <NavLink href="/abbonati" className="nav-abbonati">🔓 Abbonati</NavLink>
        )}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">↗ Vai al sito</Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
