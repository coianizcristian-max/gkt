import { createClient, getUser } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import Guida from '@/app/components/Guida'
import StatisticheClient from './StatisticheClient'
import ConfrontoPortieri from '@/app/components/ConfrontoPortieri'
import { infortuniPerPortiere } from '@/lib/infortuni'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function StatistichePage() {
  const supabase = await createClient()
  const t = await getTranslations('statistiche')
  const c = await getTranslations('common')
  const user = await getUser()

  // profilo e stagione dipendono solo da user.id, senza redirect tra i due.
  const [{ data: profilo }, { stagione }] = await Promise.all([
    supabase.from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle(),
    getStagioneAttiva(supabase, user?.id),
  ])
  const isPortiere = profilo?.ruolo === 'portiere'

  const [gatingCfg, abbAttivo] = await Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user?.id),
  ])
  const canExport = isUnlocked('report_pdf_statistiche', gatingCfg, abbAttivo)

  if (!stagione) {
    return (
      <>
        <div className="topbar"><div className="eyebrow">{t('titolo')}</div><h1>{t('titolo')}</h1></div>
        <div className="content"><div className="empty">{c('nessunaStagione')}</div></div>
      </>
    )
  }

  // "Oggi" nel fuso italiano (Europe/Rome), non in UTC: altrimenti dopo mezzanotte
  // e prima delle 02:00 (ora legale) toISOString() darebbe ancora la data di ieri e
  // le sedute di oggi/ieri sparirebbero dalle statistiche. .lte include anche oggi,
  // così un allenamento fatto oggi conta subito (esclusi solo quelli futuri generati).
  const oggiRoma = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })

  const [{ data: iscr }, { data: cats }, { data: allen }, { data: part }] = await Promise.all([
    supabase.from('iscrizioni')
      .select('portiere_id, squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url)')
      .eq('stagione_id', stagione.id),
    supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
    supabase.from('allenamenti').select('id, squadra_id, data').eq('stagione_id', stagione.id).lte('data', oggiRoma),
    supabase.from('partite').select('id, squadra_id, gol_fatti, gol_subiti, tipo, data').eq('stagione_id', stagione.id).lte('data', oggiRoma),
  ])

  const allenIds = (allen ?? []).map((a) => a.id)
  const partIds = (part ?? []).map((p) => p.id)

  const [{ data: vAll }, { data: vPar }, { data: feedbackRows }] = await Promise.all([
    allenIds.length
      ? supabase.from('valutazioni').select('portiere_id, presente, voto, allenamento_id').in('allenamento_id', allenIds)
      : Promise.resolve({ data: [] }),
    partIds.length
      ? supabase.from('valutazioni_partita').select('portiere_id, presente, voto, punti, gol_subiti, partita_id, fuori_categoria').in('partita_id', partIds)
      : Promise.resolve({ data: [] }),
    allenIds.length
      ? supabase.from('valutazioni')
        .select('portiere_id, feedback_portiere, voto_portiere, allenamento_id, portieri(nome, cognome), allenamenti(data, squadra:squadre!allenamenti_squadra_id_fkey(nome))')
        .in('allenamento_id', allenIds)
        .not('feedback_portiere', 'is', null)
        .order('allenamento_id')
      : Promise.resolve({ data: [] }),
  ])

  const catNome = {}
  for (const r of cats ?? []) if (r.squadre) catNome[r.squadre.id] = r.squadre.nome
  // Denominatore presenze = allenamenti EFFETTIVAMENTE SVOLTI/VALUTATI della categoria
  // (quelli con almeno una valutazione salvata), non tutte le sedute generate a calendario.
  // Così la lista coach coincide col tab del singolo portiere (es. 1/1, non 1/3 con 2 sedute
  // solo generate dalla ricorrenza e mai valutate).
  const allenValutatiSet = new Set((vAll ?? []).filter((v) => v.presente != null).map((v) => v.allenamento_id))
  const totAllenByCat = {}
  for (const a of allen ?? []) {
    if (!allenValutatiSet.has(a.id)) continue
    totAllenByCat[a.squadra_id] = (totAllenByCat[a.squadra_id] ?? 0) + 1
  }
  const golSubitiByPartita = {}
  const tipoPartita = {}
  for (const p of part ?? []) { golSubitiByPartita[p.id] = p.gol_subiti; tipoPartita[p.id] = p.tipo }

  const vAllBy = {}
  for (const v of vAll ?? []) (vAllBy[v.portiere_id] ??= []).push(v)
  const vParBy = {}
  for (const v of vPar ?? []) (vParBy[v.portiere_id] ??= []).push(v)

  const portieri = (iscr ?? [])
    .map((r) => (r.portieri ? { ...r.portieri, squadra_id: r.squadra_id, numero_maglia: r.numero_maglia } : null))
    .filter(Boolean)
    .sort((a, b) => (catNome[a.squadra_id] || '').localeCompare(catNome[b.squadra_id] || '') || `${a.nome}`.localeCompare(`${b.nome}`))

  const persiByPortiere = await infortuniPerPortiere(supabase, stagione.id, allen ?? [])

  const stats = portieri.map((p) => {
    const va = vAllBy[p.id] ?? []
    const presenze = va.filter((x) => x.presente).length
    const votiA = va.filter((x) => x.voto != null).map((x) => Number(x.voto))
    const mediaA = votiA.length ? votiA.reduce((s, x) => s + x, 0) / votiA.length : null
    const vp = (vParBy[p.id] ?? []).filter((x) => !x.fuori_categoria)
    // Media partite solo campionato (esclude amichevoli)
    const vpCamp = vp.filter((x) => x.presente && tipoPartita[x.partita_id] !== 'amichevole')
    const votiP = vpCamp.filter((x) => x.voto != null).map((x) => Number(x.voto))
    const mediaP = votiP.length ? votiP.reduce((s, x) => s + x, 0) / votiP.length : null
    const cleanSheet = vpCamp.filter((x) => (x.gol_subiti ?? golSubitiByPartita[x.partita_id]) === 0).length
    const punti = vp.reduce((s, x) => s + (x.punti != null ? Number(x.punti) : 0), 0)
    const nPartite = vpCamp.length
    const persi = persiByPortiere[p.id] ?? 0
    const disponibili = Math.max(0, (totAllenByCat[p.squadra_id] ?? 0) - persi)
    const gsTot = vpCamp.reduce((s, x) => { const g = x.gol_subiti ?? golSubitiByPartita[x.partita_id]; return s + (g != null ? Number(g) : 0) }, 0)
    const gsConteggio = vpCamp.filter((x) => (x.gol_subiti ?? golSubitiByPartita[x.partita_id]) != null).length
    const golSubitiGara = gsConteggio ? gsTot / gsConteggio : null
    return { p, totAllen: totAllenByCat[p.squadra_id] ?? 0, disponibili, persi, presenze, mediaA, mediaP, nPartite, cleanSheet, punti, golSubiti: gsTot, golSubitiGara }
  })

  // Statistiche feedback (P14)
  const feedbackStats = {
    totFeedback: (feedbackRows ?? []).length,
    conVoto: (feedbackRows ?? []).filter((f) => f.voto_portiere != null).length,
    mediaVotoPortiere: (() => {
      const arr = (feedbackRows ?? []).filter((f) => f.voto_portiere != null).map((f) => Number(f.voto_portiere))
      return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null
    })(),
    // Allenamenti valutati = allenamenti con almeno una valutazione presente
    allenValutati: new Set((vAll ?? []).filter((v) => v.voto != null).map((v) => v.allenamento_id)).size,
    totAllenamenti: allenIds.length,
  }

  // ANDAMENTO SQUADRA per categoria: solo partite di CAMPIONATO (tipo === 'campionato')
  // con risultato inserito (gol_fatti e gol_subiti non null). Le partite sono già
  // filtrate a data <= oggi (fuso Italia) dalla query sopra. Esito dal confronto gol:
  // vittoria +3, pareggio +1, sconfitta +0. "Serie" = striscia di vittorie consecutive
  // più lunga della stagione (le gare sono ordinate per data crescente).
  const partiteCampByCat = {}
  for (const p of part ?? []) {
    if (p.tipo !== 'campionato') continue
    if (p.gol_fatti == null || p.gol_subiti == null) continue
    ;(partiteCampByCat[p.squadra_id] ??= []).push(p)
  }
  const andamentoByCat = {}
  for (const [sqId, lista] of Object.entries(partiteCampByCat)) {
    lista.sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.id).localeCompare(String(b.id)))
    let punti = 0, golFatti = 0, golSubiti = 0, vittorie = 0, pareggi = 0, sconfitte = 0
    let streak = 0, streakMax = 0
    for (const p of lista) {
      const gf = Number(p.gol_fatti), gs = Number(p.gol_subiti)
      golFatti += gf; golSubiti += gs
      if (gf > gs) { vittorie++; punti += 3; streak++; if (streak > streakMax) streakMax = streak }
      else if (gf === gs) { pareggi++; punti += 1; streak = 0 }
      else { sconfitte++; streak = 0 }
    }
    andamentoByCat[sqId] = { giocate: lista.length, punti, golFatti, golSubiti, vittorie, pareggi, sconfitte, serie: streakMax }
  }

  const categorieOrd = (cats ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
  const byCat = {}
  for (const st of stats) (byCat[st.p.squadra_id] ??= []).push(st)

  return (
    <>
      <div className="topbar topbar-row">
        <div><div className="eyebrow">{c('stagione', { nome: stagione.nome })}</div><h1>{t('titolo')}</h1></div>
      </div>
      <div className="content">
        <Guida titolo={t('guidaTitolo')}>
          <p>{t.rich('guidaP1', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP2', { b: (ch) => <strong>{ch}</strong> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP3', { b: (ch) => <strong>{ch}</strong>, archivio: (ch) => <a href="/archivio" className="link-inline">{ch}</a> })}</p>
          <p style={{marginTop:10}}>{t.rich('guidaP4', { b: (ch) => <strong>{ch}</strong> })}</p>
        </Guida>
        <ConfrontoPortieri stagioneId={stagione.id} titolo={t('confrontoTitolo')} />
        <StatisticheClient
          stats={stats}
          categorieOrd={categorieOrd}
          byCat={byCat}
          andamentoByCat={andamentoByCat}
          feedbackStats={feedbackStats}
          feedback={feedbackRows ?? []}
          isPortiere={isPortiere}
          myPortiereId={profilo?.portiere_id ?? null}
          canExport={canExport}
        />
      </div>
    </>
  )
}
