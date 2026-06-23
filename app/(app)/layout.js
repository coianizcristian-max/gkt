import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import SignOutButton from '@/app/components/SignOutButton'
import SidebarMobile from '@/app/components/SidebarMobile'
import { createClient } from '@/lib/supabase/server'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'
import IdentificaUtenteTracking from '@/app/components/IdentificaUtenteTracking'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isStaff = false, isSupervisore = false, isPortiere = false
  let portiereId = null, societa = null, logo = null, stagioneNome = null
  let mostraAbbonati = false
  let couponGiorni = null
  let vedePortieri = true, vedeAllenamenti = true, vedePartite = true, vedeStatistiche = true
  let ruoloUtente = null

  if (user) {
    const { data: profilo } = await supabase
      .from('profili').select('ruolo, supervisore, portiere_id, permessi_collaboratore').eq('id', user.id).maybeSingle()
    const { stagione } = await getStagioneAttiva(supabase, user.id)
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
    isSupervisore = profilo?.supervisore === true
    isPortiere = profilo?.ruolo === 'portiere'
    portiereId = profilo?.portiere_id ?? null
    ruoloUtente = profilo?.ruolo ?? null
    societa = stagione?.societa_nome ?? null
    logo = stagione?.logo_url ?? null
    stagioneNome = stagione?.nome ?? null

    const ctxPermessi = { ruolo: profilo?.ruolo, permessiCollaboratore: profilo?.permessi_collaboratore }
    vedePortieri = puoVisualizzare(ctxPermessi, 'portieri')
    vedeAllenamenti = puoVisualizzare(ctxPermessi, 'allenamenti')
    vedePartite = puoVisualizzare(ctxPermessi, 'partite')
    vedeStatistiche = puoVisualizzare(ctxPermessi, 'statistiche')

    if (isStaff) {
      const { tuttoFree } = await getGatingConfig(supabase)
      const abbAttivo = await hasAbbonamento(supabase, user.id)
      mostraAbbonati = !tuttoFree && !abbAttivo

      // Controlla coupon attivo per mostrare banner giorni rimasti
      if (!abbAttivo) {
        const { data: couponAttivo } = await supabase.from('coupon_utilizzi')
          .select('scade_il').eq('utente_id', user.id)
          .gt('scade_il', new Date().toISOString()).limit(1).maybeSingle()
        if (couponAttivo) {
          const giorni = Math.ceil((new Date(couponAttivo.scade_il) - new Date()) / (1000 * 60 * 60 * 24))
          // Salva giorni per mostrarli nel layout
          couponGiorni = giorni
        }
      }
    }
  }

  const schedaHref = isPortiere && portiereId ? `/portieri/${portiereId}` : '/portieri'

  // Costruisce array voci per SidebarMobile
  const voci = [
    ...(isStaff ? [{ href: '/dashboard', label: '🏠 Dashboard' }] : []),
    ...(isPortiere || vedePortieri ? [{ href: schedaHref, label: isPortiere ? 'La mia scheda' : 'Portieri' }] : []),
    ...(isPortiere || vedeAllenamenti ? [{ href: '/calendario', label: 'Calendario' }] : []),
    ...(isStaff && vedeAllenamenti ? [{ href: '/ricorrenze', label: 'Ricorrenze' }] : []),
    ...(isPortiere || vedePartite ? [{ href: '/partite', label: 'Partite' }] : []),
    ...(isPortiere || vedeStatistiche ? [{ href: '/statistiche', label: 'Statistiche' }] : []),
    ...(isStaff && vedeAllenamenti ? [{ href: '/esercizi', label: 'Esercizi' }] : []),
    ...(isStaff ? [{ href: '/profilo', label: 'Profilo allenatore' }] : []),
    ...(isStaff ? [{ href: '/inviti', label: 'Inviti' }] : []),
    ...(isStaff ? [{ href: '/contatti', label: 'Contatti ricevuti' }] : []),
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
      <IdentificaUtenteTracking id={user?.id ?? null} email={user?.email ?? null} ruolo={ruoloUtente} />
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
        {couponGiorni != null && (
          <div style={{margin:'4px 8px 8px',padding:'6px 10px',background:'rgba(232,167,44,0.15)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--giallo)',fontWeight:600,lineHeight:1.3}}>
            🎟 Periodo gratuito: {couponGiorni} gg rimasti
          </div>
        )}
        {isStaff && <NavLink href="/dashboard">🏠 Dashboard</NavLink>}
        {(isPortiere || vedePortieri) && (isPortiere
          ? <NavLink href={schedaHref}>La mia scheda</NavLink>
          : <NavLink href="/portieri">Portieri</NavLink>)}
        {(isPortiere || vedeAllenamenti) && <NavLink href="/calendario">Calendario</NavLink>}
        {isStaff && vedeAllenamenti && <NavLink href="/ricorrenze">Ricorrenze</NavLink>}
        {(isPortiere || vedePartite) && <NavLink href="/partite">Partite</NavLink>}
        {(isPortiere || vedeStatistiche) && <NavLink href="/statistiche">Statistiche</NavLink>}
        {isStaff && vedeAllenamenti && <NavLink href="/esercizi">Esercizi</NavLink>}
        {isStaff && <NavLink href="/profilo">Profilo allenatore</NavLink>}
        {isStaff && <NavLink href="/inviti">Inviti</NavLink>}
        {isStaff && <NavLink href="/contatti">Contatti ricevuti</NavLink>}
        <NavLink href="/come-iniziare">Come iniziare</NavLink>
        <NavLink href="/archivio">Archivio</NavLink>
        <NavLink href="/suggerimenti">Suggerimenti</NavLink>
        <NavLink href="/newsletter">Newsletter</NavLink>
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
      <footer className="app-foot">
        <a href="/privacy-policy">Privacy</a>
        <span>·</span>
        <a href="/cookie-policy">Cookie</a>
        <span>·</span>
        <a href="/termini-di-servizio">Termini</a>
      </footer>
    </div>
  )
}
