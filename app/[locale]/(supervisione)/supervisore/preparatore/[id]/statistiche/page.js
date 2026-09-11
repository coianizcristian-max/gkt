import { createClient as createAdminClient } from '@supabase/supabase-js'
import { infortuniPerPortiere } from '@/lib/infortuni'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneStatistiche({ params }) {
  const { id: preparatoreId } = await params
  const t = await getTranslations('supervisionePrep')
  const c = await getTranslations('common')
  const admin = getAdmin()

  const { data: stagione } = await admin
    .from('stagioni').select('id, nome').eq('owner_id', preparatoreId).eq('attiva', true).maybeSingle()

  if (!stagione) {
    return (
      <>
        <div className="topbar"><div className="eyebrow">—</div><h1>{t('statistiche')}</h1></div>
        <div className="content"><div className="empty">{c('nessunaStagione')}</div></div>
      </>
    )
  }

  const [{ data: iscr }, { data: allen }, { data: part }] = await Promise.all([
    admin.from('iscrizioni')
      .select('portiere_id, squadra_id, portieri(id, nome, cognome)')
      .eq('stagione_id', stagione.id).eq('attivo', true),
    admin.from('allenamenti').select('id, squadra_id, data').eq('stagione_id', stagione.id),
    admin.from('partite').select('id, gol_subiti, squadra_id').eq('stagione_id', stagione.id),
  ])

  const allenIds = (allen ?? []).map(a => a.id)
  let valutazioni = []
  if (allenIds.length > 0) {
    const { data: val } = await admin
      .from('valutazioni')
      .select('portiere_id, presente, voto, allenamento_id')
      .in('allenamento_id', allenIds)
    valutazioni = val ?? []
  }

  const persiByPortiere = await infortuniPerPortiere(admin, stagione.id, allen ?? [])

  const portieri = (iscr ?? []).map(i => {
    const p = i.portieri
    if (!p) return null
    const valPor = valutazioni.filter(v => v.portiere_id === p.id)
    const presenze = valPor.filter(v => v.presente).length
    const votiArr = valPor.filter(v => v.voto != null).map(v => v.voto)
    const mediaVoto = votiArr.length > 0 ? (votiArr.reduce((a, b) => a + b, 0) / votiArr.length).toFixed(1) : '—'
    const totAllen = (allen ?? []).filter(a => a.squadra_id === i.squadra_id).length
    const persi = persiByPortiere[p.id] ?? 0
    const disponibili = Math.max(0, totAllen - persi)
    const percPresenza = disponibili > 0 ? Math.round((presenze / disponibili) * 100) : 0

    return {
      id: p.id,
      nome: `${p.nome} ${p.cognome ?? ''}`.trim(),
      presenze,
      totAllen,
      disponibili,
      persi,
      percPresenza,
      mediaVoto,
    }
  }).filter(Boolean).sort((a, b) => b.presenze - a.presenze)

  const totAllenamenti = (allen ?? []).length
  const totPartite = (part ?? []).length
  const golSubiti = (part ?? []).reduce((s, p) => s + (p.gol_subiti ?? 0), 0)
  const mediaGol = totPartite > 0 ? (golSubiti / totPartite).toFixed(2) : '—'

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">{stagione.nome}</div>
        <h1>{t('statistiche')}</h1>
      </div>
      <div className="content">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: t('kpiAllenamenti'), val: totAllenamenti, emoji: '📅' },
            { label: t('kpiPartite'), val: totPartite, emoji: '⚽' },
            { label: t('kpiGolSubiti'), val: golSubiti, emoji: '🥅' },
            { label: t('kpiMediaGol'), val: mediaGol, emoji: '📊' },
          ].map(k => (
            <div key={k.label} className="scheda" style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: 22 }}>{k.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="scheda">
          <h3 style={{ marginTop: 0 }}>{t('portieri')}</h3>
          {portieri.length === 0 && <div className="empty">{t('nessunDato')}</div>}
          {portieri.map(p => (
            <div key={p.id} className="lista-riga" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {t('allenamentiConteggio', { presenze: p.presenze, disp: p.disponibili, perc: p.percPresenza })}{p.persi > 0 ? t('persiSuffix', { n: p.persi }) : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.mediaVoto}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('media')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
