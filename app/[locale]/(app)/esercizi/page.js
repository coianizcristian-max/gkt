import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Guida from '@/app/components/Guida'
import EserciziManager from '@/app/components/EserciziManager'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import { getOwnerId } from '@/lib/tenant'
import { getTranslations } from 'next-intl/server'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export const dynamic = 'force-dynamic'

export default async function EserciziPage() {
  const supabase = await createClient()
  const t = await getTranslations('esercizi')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])
  const canLibreria = isUnlocked('esercizi_libreria', gatingCfg, abbAttivo)

  const ownerId = await getOwnerId(supabase, user.id)

  // Carica supervisore_id — se l'utente è un preparatore con responsabile
  const { data: profiloExt } = await supabase
    .from('profili').select('supervisore_id').eq('id', user.id).maybeSingle()
  const supervisoreId = profiloExt?.supervisore_id ?? null

  const [{ data: esercizi }, { data: tip }, { data: attributi }] = await Promise.all([
    supabase.from('esercizi').select('*, esercizio_attributi(attributo_id)').eq('allenatore_id', ownerId).eq('archiviato', false).order('created_at', { ascending: false }),
    supabase.from('elenco_voci').select('valore').eq('elenco', 'tipologie_esercizio').eq('attivo', true).order('ordine'),
    supabase.from('attributi_esercizio').select('id, nome').eq('attivo', true).order('ordine'),
  ])
  const tipologie = (tip ?? []).map((t) => t.valore)

  // Esercizi pubblici preferiti — query separata con gestione errore
  // (la tabella esercizi_preferiti potrebbe non esistere se il SQL non è ancora stato eseguito)
  let eserciziPubbliciPreferiti = []
  try {
    const { data: prefRows, error: prefErr } = await supabase
      .from('esercizi_preferiti').select('esercizio_id').eq('allenatore_id', user.id)
    if (!prefErr && prefRows && prefRows.length > 0) {
      const prefIds = prefRows.map((r) => r.esercizio_id)
      const { data: pubPref } = await supabase
        .from('esercizi')
        .select('*, esercizio_attributi(attributo_id)')
        .eq('pubblico', true)
        .eq('archiviato', false)
        .neq('allenatore_id', ownerId)
        .in('id', prefIds)
        .order('titolo')
      eserciziPubbliciPreferiti = pubPref ?? []
    }
  } catch (_) {
    // Tabella non ancora creata — funziona comunque senza preferiti pubblici
  }

  // Carica esercizi del responsabile se collegato
  let eserciziResponsabile = []
  if (supervisoreId) {
    try {
      const admin = getAdmin()
      // Verifica che la relazione sia ancora attiva
      const { data: rel } = await admin
        .from('relazioni_supervisione')
        .select('id')
        .eq('supervisore_id', supervisoreId)
        .eq('preparatore_id', user.id)
        .eq('attivo', true)
        .maybeSingle()
      if (rel) {
        const { data: esResp } = await admin
          .from('esercizi')
          .select('*, esercizio_attributi(attributo_id)')
          .eq('allenatore_id', supervisoreId)
          .eq('archiviato', false)
          .order('created_at', { ascending: false })
        eserciziResponsabile = esResp ?? []
      }
    } catch (_) {}
  }

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{c('areaRiservata')}</div>
        <h1>{t('titolo')}</h1>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong>, elenchi: (ch) => <a href="/supervisore/elenchi" className="link-inline">{ch}</a> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        {canLibreria
          ? <EserciziManager
              esercizi={esercizi ?? []}
              eserciziPubblici={eserciziPubbliciPreferiti}
              eserciziResponsabile={eserciziResponsabile}
              tipologie={tipologie}
              attributiDisponibili={attributi ?? []}
              allenatoreId={ownerId}
            />
          : <PaywallBanner chiave="esercizi_libreria" label={t('paywallLabel')} />}
      </div>
    </>
  )
}
