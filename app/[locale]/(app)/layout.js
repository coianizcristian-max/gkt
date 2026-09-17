import { Link } from '@/i18n/routing'
import { caricaTraduzioni } from '@/lib/traduzioni'
import { getTranslations } from 'next-intl/server'
import NavLink from '@/app/components/NavLink'
import NavIcon from '@/app/components/NavIcon'
import VersionePopup from '@/app/components/VersionePopup'
import DemoBanner from '@/app/components/DemoBanner'
import DemoPopup from '@/app/components/DemoPopup'
import DemoEntra from '@/app/components/DemoEntra'
import { getDemoConfig, inDemo } from '@/lib/demo'
import BenvenutoPopup from '@/app/components/BenvenutoPopup'
import SignOutButton from '@/app/components/SignOutButton'
import SidebarMobile from '@/app/components/SidebarMobile'
import StagioneSwitcher from '@/app/components/StagioneSwitcher'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { createClient, getUser } from '@/lib/supabase/server'
import { getGatingConfig, hasAbbonamento, getGiorniProva } from '@/lib/gating'
import { assicuraProva } from '@/lib/prova'
import { puoVisualizzare } from '@/lib/permessi'
import { getStagioneAttiva } from '@/lib/tenant'
import IdentificaUtenteTracking from '@/app/components/IdentificaUtenteTracking'
import IdleLogout from '@/app/components/IdleLogout'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const user = await getUser()
  const t = await getTranslations('sidebar')

  let isStaff = false, isSupervisore = false, isPortiere = false
  let portiereId = null, societa = null, logo = null, stagioneNome = null, stagioneId = null
  let mostraAbbonati = false
  let couponGiorni = null
  let provaGiorni = null
  let mostraBenvenuto = false
  let benvenutoNome = null
  let benvenutoGiorni = null
  let mostraPiani = false
  let vedePortieri = true, vedeAllenamenti = true, vedePartite = true, vedeStatistiche = true
  let ruoloUtente = null
  let haPreparatori = false
  let altreStagioni = []
  let newsletterNonLette = 0
  let contattiNonLetti = 0

  if (user) {
    const { data: profilo } = await supabase
      .from('profili').select('ruolo, supervisore, portiere_id, permessi_collaboratore, newsletter_vista_il, nome_visualizzato, nome_completo, prova_creata, benvenuto_visto').eq('id', user.id).maybeSingle()
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

    await assicuraProva(supabase, user, profilo)

    if (profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'portiere') {
      const { data: provaRow } = await supabase.from('abbonamenti')
        .select('scadenza').eq('allenatore_id', user.id).eq('stato', 'prova')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (provaRow?.scadenza) {
        const gg = Math.ceil((new Date(provaRow.scadenza) - new Date()) / (1000 * 60 * 60 * 24))
        if (gg > 0) provaGiorni = gg
      }
    }

    mostraBenvenuto = !profilo?.benvenuto_visto && (profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'portiere')
    if (mostraBenvenuto) {
      benvenutoNome = profilo?.nome_visualizzato || profilo?.nome_completo || null
      benvenutoGiorni = provaGiorni ?? await getGiorniProva(supabase, profilo.ruolo)
      // Mostra "Vedi i piani" solo se NON è tutto gratis (altrimenti /abbonati rimanda in home).
      const { tuttoFree: tfBenv } = await getGatingConfig(supabase)
      mostraPiani = !tfBenv
    }

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

    // Changelog tradotto: 'note' e' un array, in contenuti_traduzioni viaggia
    // come testo unico a capo-per-riga e qui torna array.
    if (ultimaVersione) {
      try {
        const locale = await getLocale()
        const trV = await caricaTraduzioni(supabase, 'versioni', [ultimaVersione.id], locale)
        const titoloTr = trV(ultimaVersione.id, 'titolo')
        const noteTr = trV(ultimaVersione.id, 'note')
        if (titoloTr) ultimaVersione.titolo = titoloTr
        if (noteTr) ultimaVersione.note = noteTr.split('\n').map((r) => r.trim()).filter(Boolean)
      } catch (e) {
        // tradotto non disponibile: resta l'italiano
      }
    }
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

  // ── Modalita' demo ────────────────────────────────────────────────────
  // Visibile solo ai preparatori, solo se attivata dal pannello supervisore
  // e mai al proprietario stesso della stagione demo.
  const demoCfg = await getDemoConfig()
  const demoAttiva = demoCfg.attiva && !!demoCfg.ownerId
  const demoVisibile = demoAttiva && ruoloUtente === 'allenatore' && user?.id !== demoCfg.ownerId
  const demoInCorso = demoVisibile && (await inDemo())
  const demoAvvisiVisti = Number(profilo?.demo_avvisi_visti ?? 0)
  const mostraDemoPopup = demoInCorso && demoAvvisiVisti < demoCfg.avvisiIngresso

  // Carica ordine sidebar personalizzato dal supervisore
  const { data: sidebarOrdineRows } = await supabase
    .from('sidebar_ordine').select('chiave, ordine').order('ordine')
  const sidebarOrdine = sidebarOrdineRows ?? []

  // Costruisce mappa chiave→voce (con condizioni di visibilità)
  const tutteLeVoci = {
    'dashboard':     isStaff ? { href: '/dashboard', label: t('dashboard') } : null,
    'portieri':      (isPortiere || vedePortieri) ? { href: isPortiere ? schedaHref : '/portieri', label: isPortiere ? t('miaScheda') : t('portieri') } : null,
    'calendario':    (isPortiere || vedeAllenamenti) ? { href: '/calendario', label: t('calendario') } : null,
    'ricorrenze':    (isStaff && vedeAllenamenti) ? { href: '/ricorrenze', label: t('ricorrenze') } : null,
    'partite':       (isPortiere || vedePartite) ? { href: '/partite', label: t('partite') } : null,
    'obiettivi-portiere': (isPortiere && portiereId) ? { href: `${schedaHref}/obiettivi`, label: t('obiettivi') } : null,
    'percorso-portiere':  (isPortiere && portiereId) ? { href: `${schedaHref}/percorso`, label: t('percorso') } : null,
    'andamento-portiere': (isPortiere && portiereId) ? { href: `${schedaHref}/andamento`, label: t('andamento') } : null,
    'statistiche':   (isPortiere || vedeStatistiche) ? { href: '/statistiche', label: t('statistiche') } : null,
    'esercizi':      (isStaff && vedeAllenamenti) ? { href: '/esercizi', label: t('esercizi') } : null,
    'template-allenamenti': (isStaff && vedeAllenamenti) ? { href: '/template-allenamenti', label: t('templateAllenamenti') } : null,
    'profilo':       isStaff ? { href: '/profilo', label: t('profiloAllenatore') } : null,
    'stagioni':      isStaff ? { href: '/stagioni', label: t('mieStagioni') } : null,
    'categorie':     isStaff ? { href: '/categorie', label: t('mieCategorie') } : null,
    'parametri-valutazione': isStaff ? { href: '/parametri-valutazione', label: t('navParametriValutazione') } : null,
    'inviti':        isStaff ? { href: '/inviti', label: t('inviti') } : null,
    'i-miei-preparatori': (ruoloUtente === 'allenatore' && haPreparatori) ? { href: '/i-miei-preparatori', label: t('mieiPreparatori') } : null,
    'contatti':      isStaff ? { href: '/contatti', label: contattiNonLetti > 0 ? <>{t('contatti')} <span className="nav-badge">{contattiNonLetti}</span></> : t('contatti') } : null,
    'come-iniziare': { href: '/come-iniziare', label: t('comeIniziare') },
    'faq':           { href: '/faq', label: t('faq') },
    'archivio':      { href: '/archivio', label: t('archivio') },
    'suggerimenti':  { href: '/suggerimenti', label: t('suggerimenti') },
    'newsletter':    { href: '/newsletter', label: newsletterNonLette > 0 ? <>{t('newsletter')} <span className="nav-badge">{newsletterNonLette}</span></> : t('newsletter') },
    'account':       { href: '/account', label: t('account') },
    'supervisore':   isSupervisore ? { href: '/supervisore', label: t('supervisore') } : null,
    'abbonati':      mostraAbbonati ? { href: '/abbonati', label: t('abbonati') } : null,
  }

  // Ordina le chiavi secondo sidebarOrdine dal DB; le chiavi non presenti vanno in fondo
  const ordineChiavi = sidebarOrdine.length > 0
    ? sidebarOrdine.map((r) => r.chiave)
    : Object.keys(tutteLeVoci)
  // Aggiungi chiavi non coperte dall'ordine salvato (nuove voci future)
  let tutteChiavi = [...ordineChiavi, ...Object.keys(tutteLeVoci).filter(k => !ordineChiavi.includes(k))]
  // Per il portiere, forza "Obiettivi" e "Percorso" subito dopo "Partite"
  // (l'ordine salvato in DB non le contiene, altrimenti finirebbero in fondo).
  if (isPortiere) {
    tutteChiavi = tutteChiavi.filter((k) => k !== 'obiettivi-portiere' && k !== 'percorso-portiere' && k !== 'andamento-portiere')
    const idx = tutteChiavi.indexOf('partite')
    if (idx >= 0) tutteChiavi.splice(idx + 1, 0, 'obiettivi-portiere', 'percorso-portiere', 'andamento-portiere')
    else tutteChiavi.push('obiettivi-portiere', 'percorso-portiere', 'andamento-portiere')
  }

  const voci = [
    ...tutteChiavi.map((k) => tutteLeVoci[k]).filter(Boolean),
    { type: 'divider', key: 'd1' },
    { href: '/', label: t('vaiAlSito') },
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
            {!isStaff && stagioneNome && <span className="brand-stagione">{t('stagione', { nome: stagioneNome })}</span>}
          </div>
        </Link>
        {isStaff && <div className="brand-switcher-wrap"><StagioneSwitcher stagioni={altreStagioni} stagioneCorrenteId={stagioneId} /></div>}
        <div className="sidebar-lang" style={{ padding: '4px 8px 8px' }}><LanguageSwitcher /></div>
        {couponGiorni != null && (
          <div style={{margin:'4px 8px 8px',padding:'6px 10px',background:'rgba(232,167,44,0.15)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--giallo)',fontWeight:600,lineHeight:1.3}}>
            {t('couponGiorni', { giorni: couponGiorni })}
          </div>
        )}
        {couponGiorni == null && provaGiorni != null && (
          <div style={{margin:'4px 8px 8px',padding:'6px 10px',background:'rgba(232,167,44,0.15)',borderRadius:'var(--r-sm)',fontSize:12,color:'var(--giallo)',fontWeight:600,lineHeight:1.3}}>
            {t('provaBanner', { giorni: provaGiorni })}
          </div>
        )}
        {voci.filter(v => v.href && v.href !== '/').map((v) => (
          <NavLink key={v.href} href={v.href} extraClass={v.href === '/supervisore' ? 'nav-link-supervisore' : ''}><NavIcon href={v.href} />{v.label}</NavLink>
        ))}
        {demoVisibile && !demoInCorso && (
          <DemoEntra label={t('stagioneDemo')} className="nav-link nav-demo" />
        )}
        <div className="sidebar-foot">
          <Link href="/" className="nav-link nav-sito">{t('vaiAlSito')}</Link>
          <SignOutButton />
        </div>
      </aside>

      {/* Header mobile con hamburger */}
      <SidebarMobile voci={voci} brand={brand}
        demoLabel={demoVisibile && !demoInCorso ? t('stagioneDemo') : null} />

      <div className="main-col">
        <main className="main">{children}</main>
        <footer className="app-foot">
          <Link href="/privacy-policy">{t('privacy')}</Link>
          <span>·</span>
          <Link href="/cookie-policy">{t('cookie')}</Link>
          <span>·</span>
          <Link href="/termini-di-servizio">{t('termini')}</Link>
        </footer>
      </div>
      {demoInCorso && <DemoBanner dataTaglio={demoCfg.dataTaglio} />}
      {mostraDemoPopup
        ? <DemoPopup dataTaglio={demoCfg.dataTaglio} />
        : mostraBenvenuto
          ? <BenvenutoPopup nome={benvenutoNome} giorni={benvenutoGiorni} ruolo={ruoloUtente} mostraPiani={mostraPiani} />
          : (versioneNuova && <VersionePopup versione={versioneNuova} />)}
    </div>
  )
}
