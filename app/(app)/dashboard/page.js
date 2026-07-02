import Link from 'next/link'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

function fmtData(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtOra(t) { return t ? t.slice(0, 5) : '' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id, nome_visualizzato').eq('id', user.id).maybeSingle()

  // I portieri hanno già la loro scheda come "home" — qui reindirizziamo
  if (profilo?.ruolo === 'portiere' && profilo.portiere_id) {
    redirect(`/portieri/${profilo.portiere_id}`)
  }
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { stagione } = await getStagioneAttiva(supabase, user.id)

  const oggi = new Date()
  const oggiStr = oggi.toISOString().slice(0, 10)
  const tra7gg = new Date(oggi); tra7gg.setDate(tra7gg.getDate() + 7)
  const tra7ggStr = tra7gg.toISOString().slice(0, 10)

  let daValutareAllenamenti = []
  let daValutarePartite = []
  let prossimoAllenamento = null
  let partiteImminenti = []
  let coupon = null

  if (stagione) {
    const [allRows, parRows, couponRow] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, ora_inizio, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('partite')
        .select('id, data, avversario, casa, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('coupon_utilizzi').select('scade_il').eq('utente_id', user.id)
        .gt('scade_il', new Date().toISOString()).order('scade_il', { ascending: false }).limit(1).maybeSingle(),
    ])

    const allenamenti = allRows.data ?? []
    const partiteRows = parRows.data ?? []
    const allenIds = allenamenti.map((a) => a.id)
    const partitaIds = partiteRows.map((p) => p.id)

    const [valRows, valParRows] = await Promise.all([
      allenIds.length ? supabase.from('valutazioni').select('allenamento_id').in('allenamento_id', allenIds) : Promise.resolve({ data: [] }),
      partitaIds.length ? supabase.from('valutazioni_partita').select('partita_id').eq('presente', true).in('partita_id', partitaIds) : Promise.resolve({ data: [] }),
    ])

    const valutatiSet = new Set((valRows.data ?? []).map((v) => v.allenamento_id))
    const partite = partiteRows
    const partiteValutateSet = new Set((valParRows.data ?? []).map((v) => v.partita_id))

    // Allenamenti passati senza valutazione
    daValutareAllenamenti = allenamenti
      .filter((a) => a.data < oggiStr && !valutatiSet.has(a.id))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8)

    // Prossimo allenamento futuro (incluso oggi)
    prossimoAllenamento = allenamenti.find((a) => a.data >= oggiStr) ?? null

    // Partite nei prossimi 7 giorni
    partiteImminenti = partite
      .filter((p) => p.data >= oggiStr && p.data <= tra7ggStr)
      .sort((a, b) => a.data.localeCompare(b.data))

    // Partite passate senza valutazioni
    daValutarePartite = partite
      .filter((p) => p.data < oggiStr && !partiteValutateSet.has(p.id))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 5)

    coupon = couponRow.data
  }

  // ── Portieri da attenzionare: assenze ripetute, calo rendimento, obiettivi in ritardo ──
  let portieriAttenzione = []
  if (stagione) {
    const { data: iscrRows } = await supabase.from('iscrizioni')
      .select('portiere_id, portieri(id, nome, cognome)').eq('stagione_id', stagione.id)
    const portieriList = (iscrRows ?? []).map((r) => r.portieri).filter(Boolean)
    const portiereIds = portieriList.map((p) => p.id)

    if (portiereIds.length) {
      const allenIds = (await supabase.from('allenamenti').select('id, data').eq('stagione_id', stagione.id)).data ?? []
      const dataByAllen = {}
      for (const a of allenIds) dataByAllen[a.id] = a.data

      const { data: valRows } = await supabase.from('valutazioni')
        .select('portiere_id, allenamento_id, presente, voto')
        .in('portiere_id', portiereIds).in('allenamento_id', allenIds.map((a) => a.id))

      const { data: obRows } = await supabase.from('obiettivi')
        .select('portiere_id, scadenza, stato').in('portiere_id', portiereIds)

      const motiviPerPortiere = {}
      const aggiungiMotivo = (pid, motivo) => (motiviPerPortiere[pid] ??= []).push(motivo)

      // Raggruppa valutazioni per portiere, ordinate per data allenamento
      const valByPortiere = {}
      for (const v of valRows ?? []) {
        const data = dataByAllen[v.allenamento_id]
        if (!data) continue
        ;(valByPortiere[v.portiere_id] ??= []).push({ ...v, data })
      }
      for (const pid of Object.keys(valByPortiere)) {
        const serie = valByPortiere[pid].sort((a, b) => b.data.localeCompare(a.data))

        // Assenze ripetute: 2+ assenze nelle ultime 3 convocazioni
        const ultime3 = serie.slice(0, 3)
        const assenze = ultime3.filter((v) => !v.presente).length
        if (ultime3.length >= 2 && assenze >= 2) aggiungiMotivo(pid, `${assenze} assenze nelle ultime ${ultime3.length} convocazioni`)

        // Calo rendimento: media ultime 3 presenti vs media 3 precedenti
        const presentiConVoto = serie.filter((v) => v.presente && v.voto != null)
        if (presentiConVoto.length >= 4) {
          const recenti = presentiConVoto.slice(0, 3).map((v) => Number(v.voto))
          const precedenti = presentiConVoto.slice(3, 6).map((v) => Number(v.voto))
          if (precedenti.length >= 2) {
            const mediaRecente = recenti.reduce((s, x) => s + x, 0) / recenti.length
            const mediaPrecedente = precedenti.reduce((s, x) => s + x, 0) / precedenti.length
            const calo = mediaRecente - mediaPrecedente
            if (calo <= -1.5) aggiungiMotivo(pid, `Calo voto: ${mediaPrecedente.toFixed(1)} → ${mediaRecente.toFixed(1)}`)
          }
        }
      }

      // Obiettivi in ritardo: scadenza superata e non raggiunto
      for (const o of obRows ?? []) {
        if (o.scadenza && o.scadenza < oggiStr && o.stato !== 'raggiunto') {
          aggiungiMotivo(o.portiere_id, 'Obiettivo in ritardo')
        }
      }

      portieriAttenzione = portieriList
        .filter((p) => motiviPerPortiere[p.id]?.length > 0)
        .map((p) => ({ ...p, motivi: motiviPerPortiere[p.id] }))
    }
  }

  const totDaValutare = daValutareAllenamenti.length + daValutarePartite.length
  const couponGiorni = coupon ? Math.ceil((new Date(coupon.scade_il) - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
        <h1>Ciao{profilo?.nome_visualizzato ? `, ${profilo.nome_visualizzato.split(' ')[0]}` : ''} 👋</h1>
      </div>
      <div className="content">

        {couponGiorni != null && (
          <div style={{ background: 'rgba(232,167,44,0.12)', border: '1px solid var(--giallo)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--giallo)', fontWeight: 600 }}>
            🎟 Periodo gratuito: {couponGiorni} giorni rimasti
          </div>
        )}

        <Guida titolo="Come leggere la dashboard">
          <p>
            La dashboard è il punto di partenza: mostra subito gli <strong>allenamenti e le partite passate ancora da valutare</strong>
            (in rosso), il <strong>prossimo allenamento</strong> in programma e le <strong>partite nei prossimi 7 giorni</strong>.
          </p>
          <p style={{marginTop:10}}>
            Il riquadro giallo <strong>&ldquo;Portieri da attenzionare&rdquo;</strong> segnala automaticamente i portieri
            con almeno 2 assenze nelle ultime 3 convocazioni, un calo di rendimento significativo (−1.5 punti di media)
            o un obiettivo con scadenza superata non ancora raggiunto.
          </p>
        </Guida>

        {/* Widget principale: cosa devo fare oggi */}
        {totDaValutare > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--rosso)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--rosso)' }}>
              ⚠ {totDaValutare} {totDaValutare === 1 ? 'cosa da valutare' : 'cose da valutare'}
            </h3>
            {daValutareAllenamenti.map((a) => (
              <Link key={a.id} href={`/calendario/${a.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏃 Allenamento — {a.squadra?.nome}</span>
                <span className="dv-data">{fmtData(a.data)}</span>
              </Link>
            ))}
            {daValutarePartite.map((p) => (
              <Link key={p.id} href={`/partite/${p.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⚽ Partita vs {p.avversario || '—'} — {p.squadre?.nome}</span>
                <span className="dv-data">{fmtData(p.data)}</span>
              </Link>
            ))}
          </div>
        )}

        {totDaValutare === 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--campo)', maxWidth: 'none' }}>
            <p style={{ margin: 0, color: 'var(--campo)', fontWeight: 600 }}>✓ Tutto valutato, sei in pari!</p>
          </div>
        )}

        {portieriAttenzione.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--giallo)', maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, color: 'var(--giallo)' }}>
              👁 {portieriAttenzione.length} {portieriAttenzione.length === 1 ? 'portiere da attenzionare' : 'portieri da attenzionare'}
            </h3>
            {portieriAttenzione.map((p) => (
              <Link key={p.id} href={`/portieri/${p.id}`} className="dv-item" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{p.nome} {p.cognome ?? ''}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {p.motivi.map((m, i) => (
                    <span key={i} style={{ fontSize: 11, color: 'var(--giallo)', background: 'rgba(232,167,44,0.12)', padding: '2px 8px', borderRadius: 999 }}>
                      {m}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="dash-grid">
          {/* Prossimo allenamento */}
          <div className="scheda" style={{ maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>📅 Prossimo allenamento</h3>
            {prossimoAllenamento ? (
              <Link href={`/calendario/${prossimoAllenamento.id}`} className="link-inline" style={{ display: 'block' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{prossimoAllenamento.squadra?.nome}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {prossimoAllenamento.data === oggiStr ? 'Oggi' : fmtData(prossimoAllenamento.data)}
                  {prossimoAllenamento.ora_inizio ? ` · ${fmtOra(prossimoAllenamento.ora_inizio)}` : ''}
                </div>
              </Link>
            ) : (
              <p className="sub-intro" style={{ margin: 0 }}>Nessun allenamento programmato.</p>
            )}
          </div>

          {/* Partite imminenti */}
          <div className="scheda" style={{ maxWidth: 'none' }}>
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>⚽ Partite nei prossimi 7 giorni</h3>
            {partiteImminenti.length === 0 ? (
              <p className="sub-intro" style={{ margin: 0 }}>Nessuna partita in programma.</p>
            ) : partiteImminenti.map((p) => (
              <Link key={p.id} href={`/partite/${p.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.squadre?.nome ? `${p.squadre.nome} · ` : ''}{p.casa === true ? '🏠' : p.casa === false ? '✈' : '❔'} {p.avversario || '—'}</span>
                <span className="dv-data">{fmtData(p.data)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Link rapidi */}
        <div className="scheda" style={{ marginTop: 16, maxWidth: 'none' }}>
          <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>Accesso rapido</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/portieri" className="btn-ghost" style={{ fontSize: 13 }}>👥 Portieri</Link>
            <Link href="/calendario" className="btn-ghost" style={{ fontSize: 13 }}>📅 Calendario</Link>
            <Link href="/partite" className="btn-ghost" style={{ fontSize: 13 }}>⚽ Partite</Link>
            <Link href="/statistiche" className="btn-ghost" style={{ fontSize: 13 }}>📊 Statistiche</Link>
          </div>
        </div>

      </div>
    </>
  )
}
