import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

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
    const [allRows, valRows, parRows, valParRows, couponRow] = await Promise.all([
      supabase.from('allenamenti')
        .select('id, data, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('valutazioni').select('allenamento_id'),
      supabase.from('partite')
        .select('id, data, avversario, casa, tipo, squadre(nome)')
        .eq('stagione_id', stagione.id).order('data'),
      supabase.from('valutazioni_partita').select('partita_id').eq('presente', true),
      supabase.from('coupon_utilizzi').select('scade_il').eq('utente_id', user.id)
        .gt('scade_il', new Date().toISOString()).order('scade_il', { ascending: false }).limit(1).maybeSingle(),
    ])

    const allenamenti = allRows.data ?? []
    const valutatiSet = new Set((valRows.data ?? []).map((v) => v.allenamento_id))
    const partite = parRows.data ?? []
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

        {/* Widget principale: cosa devo fare oggi */}
        {totDaValutare > 0 && (
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--rosso)' }}>
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
          <div className="scheda" style={{ marginBottom: 16, borderLeft: '4px solid var(--campo)' }}>
            <p style={{ margin: 0, color: 'var(--campo)', fontWeight: 600 }}>✓ Tutto valutato, sei in pari!</p>
          </div>
        )}

        <div className="dash-grid">
          {/* Prossimo allenamento */}
          <div className="scheda">
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>📅 Prossimo allenamento</h3>
            {prossimoAllenamento ? (
              <Link href={`/calendario/${prossimoAllenamento.id}`} className="link-inline" style={{ display: 'block' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{prossimoAllenamento.squadra?.nome}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {prossimoAllenamento.data === oggiStr ? 'Oggi' : fmtData(prossimoAllenamento.data)}
                </div>
              </Link>
            ) : (
              <p className="sub-intro" style={{ margin: 0 }}>Nessun allenamento programmato.</p>
            )}
          </div>

          {/* Partite imminenti */}
          <div className="scheda">
            <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>⚽ Partite nei prossimi 7 giorni</h3>
            {partiteImminenti.length === 0 ? (
              <p className="sub-intro" style={{ margin: 0 }}>Nessuna partita in programma.</p>
            ) : partiteImminenti.map((p) => (
              <Link key={p.id} href={`/partite/${p.id}`} className="dv-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.casa ? '🏠' : '✈'} {p.avversario || '—'}</span>
                <span className="dv-data">{fmtData(p.data)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Link rapidi */}
        <div className="scheda" style={{ marginTop: 16 }}>
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
