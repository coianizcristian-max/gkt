import Link from 'next/link'
import NavLink from '@/app/components/NavLink'
import VersionePopup from '@/app/components/VersionePopup'
import SignOutButton from '@/app/components/SignOutButton'
import SidebarMobile from '@/app/components/SidebarMobile'
import StagioneSwitcher from '@/app/components/StagioneSwitcher'
import { createClient, getUser } from '@/lib/supabase/server'
import { getGatingConfig, hasAbbonamento } from '@/lib/gating'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'
import IdentificaUtenteTracking from '@/app/components/IdentificaUtenteTracking'
import IdleLogout from '@/app/components/IdleLogout'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const user = await getUser()

  let isStaff = false, isSupervisore = false, isPortiere = false
  let portiereId = null, societa = null, logo = null, stagioneNome = null, stagioneId = null
  let mostraAbbonati = false
  let couponGiorni = null
  let vedePortieri = true, vedeAllenamenti = true, vedePartite = true, vedeStatistiche = true
  let ruoloUtente = null
  let haPreparatori = false
  let altreStagioni = []
  let newsletterNonLette = 0
  let contattiNonLetti = 0

  if (user) {
    const { data: profilo } = await supabase
      .from('profili').select('ruolo, supervisore, portiere_id, permessi_collaboratore, newsletter_vista_il').eq('id', user.id).maybeSingle()
    const { stagione, ownerId } = await getStagioneAttiva(supabase, user.id)
    isStaff = profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff'
    isSupervisore = profilo?.supervisore === true
    isPortiere = profilo?.ruolo === 'portiere'
    portiereId = profilo?.portiere_id ?? null
    ruoloUtente = profilo?.ruolo ?? null
    societa = stagione?.societa_nome ?? null
    logo = stagione?.logo_url ?? null
    stagioneNome = stagione?.nome ?? null
    stagioneId = stagione?.id ?? null

    const { count: nCount } = await supabase
      .from('newsletter_invii').select('id', { count: 'exact', head: true })
      .eq('pubblicata', true)
      .gt('inviata_il', profilo?.newsletter_vista_il ?? '1970-01-01')
    newsletterNonLette = nCount ?? 0

    // Badge contatti ricevuti: stesso principio della newsletter, ma qui il flag
    // "letto" e' per singolo messaggio, non una data di ultima visita. I record
    // vecchi possono avere letto = null: vanno contati come non letti, come fa
    // gia' la pagina /contatti con !m.letto.
    if (isStaff) {
      const { count: cCount } = await supabase
        .from('messaggi_contatto').select('id', { count: 'exact', head: true })
        .eq('allenatore_id', user.id)
        .or('letto.is.null,letto.eq.false')
      contattiNonLetti = cCount ?? 0
    }

    const ctxPermessi = { ruolo: profilo?.ruolo, permessiCollaboratore: profilo?.permessi_collaboratore }
    vedePortieri = puoVisualizzare(ctxPermessi, 'portieri')
    vedeAllenamenti = puoVisualizzare(ctxPermessi, 'allenamenti')
    vedePartite = puoVisualizzare(ctxPermessi, 'partite')
    vedeStatistiche = puoVisualizzare(ctxPermessi, 'statistiche')

    if (isStaff && ownerId && stagione?.nome) {
      const { data: elencoStagioni } = await supabase
        .from('stagioni').select('id, nome, societa_nome')
        .eq('owner_id', ownerId).eq('attiva', true).eq('nome', stagione.nome)
        .order('created_at', { ascending: false })
      altreStagioni = elencoStagioni ?? []
    }

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

      // Controlla se ha almeno un preparatore collegato (per mostrare voce sidebar)
      if (profilo?.ruolo === 'allenatore') {
        const { count } = await supabase
          .from('relazioni_supervisione')
          .select('id', { count: 'exact', head: true })
          .eq('supervisore_id', user.id)
          .eq('attivo', true)
        haPreparatori = (count ?? 0) > 0
      }
    }
  }

  const schedaHref = isPortiere && portiereId ? `/portieri/${portiereId}` : '/dashboard'

  // Controlla se c'è una nuova versione non ancora vista dall'utente
  let versioneNuova = null
  if (user) {
    const { data: ultimaVersione } = await supabase
      .from('versioni')
      .select('id, numero, titolo, note')
      .eq('pubblicata', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ultimaVersione) {
      const { data: giàVista } = await supabase
        .from('versioni_viste')
        .select('versione_id')
        .eq('user_id', user.id)
        .eq('versione_id', ultimaVersione.id)
        .maybeSingle()
      if (!giàVista) versioneNuova = ultimaVersione
    }
  }

  // Carica ordine sidebar personalizzato dal supervisore
  const { data: sidebarOrdineRows } = await supabase
    .from('sidebar_ordine').select('chiave, ordine').order('ordine')
  const sidebarOrdine = sidebarOrdineRows ?? []

  // Costruisce mappa chiave→voce (con condizioni di visibilità)
  const tutteLeVoci = {
    'dashboard':     isStaff ? { href: '/dashboard', label: '🏠 Dashboard' } : null,
    'portieri':      (isPortiere || vedePortieri) ? { href: isPortiere ? schedaHref : '/portieri', label: isPortiere ? 'La mia scheda' : 'Portieri' } : null,
    'calendario':    (isPortiere || vedeAllenamenti) ? { href: '/calendario', label: 'Calendario' } : null,
    'ricorrenze':    (isStaff && vedeAllenamenti) ? { href: '/ricorrenze', label: 'Ricorrenze' } : null,
    'partite':       (isPortiere || vedePartite) ? { href: '/partite', label: 'Partite' } : null,
    'statistiche':   (isPortiere || vedeStatistiche) ? { href: '/statistiche', label: 'Statistiche' } : null,
    'esercizi':      (isStaff && vedeAllenamenti) ? { href: '/esercizi', label: 'Esercizi' } : null,
    'template-allenamenti': (isStaff && vedeAllenamenti) ? { href: '/template-allenamenti', label: 'Template allenamenti' } : null,
    'profilo':       isStaff ? { href: '/profilo', label: 'Profilo allenatore' } : null,
    'stagioni':      isStaff ? { href: '/stagioni', label: 'Le mie stagioni' } : null,
    'categorie':     isStaff ? { href: '/categorie', label: 'Le mie categorie' } : null,
    'inviti':        isStaff ? { href: '/inviti', label: 'Inviti' } : null,
    'i-miei-preparatori': (ruoloUtente === 'allenatore' && haPreparatori) ? { href: '/i-miei-preparatori', label: '🔗 I miei preparatori' } : null,
    'contatti':      isStaff ? { href: '/contatti', label: contattiNonLetti > 0 ? <>Contatti ricevuti <span className="nav-badge">{contattiNonLetti}</span></> : 'Contatti ricevuti' } : null,
    'come-iniziare': { href: '/come-iniziare', label: 'Come iniziare' },
    'faq':           { href: '/faq', label: 'Domande frequenti' },
    'archivio':      { href: '/archivio', label: 'Archivio' },
    'suggerimenti':  { href: '/suggerimenti', label: 'Suggerimenti' },
    'newsletter':    { href: '/newsletter', label: newsletterNonLette > 0 ? <>Newsletter <span className="nav-badge">{newsletterNonLette}</span></> : 'Newsletter' },
    'account':       { href: '/account', label: '👤 Account' },
    'supervisore':   isSupervisore ? { href: '/supervisore', label: 'Supervisore' } : null,
    'abbonati':      mostraAbbonati ? { href: '/abbonati', label: '🔓 Abbonati' } : null,
  }

  // Ordina le chiavi secondo sidebarOrdine dal DB; le chiavi non presenti vanno in fondo
  const ordineChiavi = sidebarOrdine.length > 0
    ? sidebarOrdine.map((r) => r.chiave)
    : Object.keys(tutteLeVoci)
  // Aggiungi chiavi non coperte dall'ordine salvato (nuove voci future)
  const tutteChiavi = [...ordineChiavi, ...Object.keys(tutteLeVoci).filter(k => !ordineChiavi.includes(k))]

  const voci = [
    ...tutteChiavi.map((k) => tutteLeVoci[k]).filter(Boolean),
    { type: 'divider', key: 'd1' },
    { href: '/', label: '↗ Vai al sito' },
    { type: 'signout', key: 'signout' },
  ]

  const brand = { href: schedaHref, logo, societa, stagioneNome, isStaff, altreStagioni, stagioneId }

  return (
    <div className="shell">
      <IdentificaUtenteTracking id={user?.id ?? null} email={user?.email ?? null} ruolo={ruoloUtente} />
      {user && <IdleLogout />}
      {/* Sidebar desktop */}
      <aside className="sidebar">
        <Link href={schedaHref} className="brand">
          {logo ? <img className="brand-logo" src={logo} alt="" /> : <div className="glove">GK</div>}
          <div>
            <b>GKSeason</b>
            {!isStaff && societa && <span>{societa}</span>}
            {!isStaff && stagioneNome && <span className="brand-stagione">Stagione {stagioneNome}</span>}
          </div>
        </Link>
        {isStaff && <div className="brand-switcher-wrap"><StagioneSwitcher stagioni={altreStagioni} stagioneCorrenteId={stagioneId} /></div>}
        {couponGiorni != null && (
          <div style={{margin:'4px 8px 8px',padding:'6px 10px',background:'rgba(232,167,44,0.15)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--giallo)',fontWeight:600,lineHeight:1.3}}>
            🎟 Periodo gratuito: {couponGiorni} gg rimasti
          </div>
        )}
        {voci.filter(v => v.href && v.href !== '/').map((v) => (
          <NavLink key={v.href} href={v.href} extraClass={v.href === '/supervisore' ? 'nav-link-supervisore' : ''}>{v.label}</NavLink>
        ))}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">↗ Vai al sito</Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Header mobile con hamburger */}
      <SidebarMobile voci={voci} brand={brand} />

      <div className="main-col">
        <main className="main">{children}</main>
        <footer className="app-foot">
          <a href="/privacy-policy">Privacy</a>
          <span>·</span>
          <a href="/cookie-policy">Cookie</a>
          <span>·</span>
          <a href="/termini-di-servizio">Termini</a>
        </footer>
      </div>
      {versioneNuova && <VersionePopup versione={versioneNuova} />}
    </div>
  )
}
