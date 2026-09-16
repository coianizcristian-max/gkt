import { redirect } from 'next/navigation'
import Guida from '@/app/components/Guida'
import { createClient } from '@/lib/supabase/server'
import ParametriValutazioneManager from '@/app/components/ParametriValutazioneManager'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import { caricaParametri } from '@/lib/parametri'

export const dynamic = 'force-dynamic'

export default async function ParametriValutazionePage() {
  const supabase = await createClient()
  const t = await getTranslations('parametri')
  const c = await getTranslations('common')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const [{ data: parametri }, { data: selezione }] = await Promise.all([
    caricaParametri(supabase, await getLocale()),
    supabase.from('allenatore_parametri').select('parametro_id, attivo').eq('allenatore_id', user.id),
  ])

  // Se l'allenatore non ha mai selezionato nulla, di default sono tutti attivi
  const haSelezione = (selezione ?? []).length > 0
  const attiviMap = {}
  if (haSelezione) {
    for (const p of parametri ?? []) attiviMap[p.id] = false
    for (const s of selezione) attiviMap[s.parametro_id] = s.attivo
  } else {
    for (const p of parametri ?? []) attiviMap[p.id] = true
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
          <p style={{marginTop:10}}>{t.rich('guidaP2', { sup: (ch) => <a href="/supervisore" className="link-inline">{ch}</a> })}</p>
        </Guida>
        <ParametriValutazioneManager parametri={parametri ?? []} attiviMap={attiviMap} />
      </div>
    </>
  )
}
