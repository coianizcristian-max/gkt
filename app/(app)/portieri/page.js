import Link from 'next/link'
import Guida from '@/app/components/Guida'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function calcEta(dataNascita) {
  if (!dataNascita) return null
  const oggi = new Date()
  const n = new Date(dataNascita + 'T00:00:00')
  let eta = oggi.getFullYear() - n.getFullYear()
  if (oggi.getMonth() < n.getMonth() || (oggi.getMonth() === n.getMonth() && oggi.getDate() < n.getDate())) eta--
  return eta
}

export default async function PortieriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profilo } = await supabase
    .from('profili').select('ruolo, portiere_id').eq('id', user?.id).maybeSingle()
  if (profilo?.ruolo === 'portiere' && profilo.portiere_id) {
    redirect(`/portieri/${profilo.portiere_id}`)
  }

  const { data: stagione } = await supabase
    .from('stagioni').select('id, nome').eq('attiva', true).maybeSingle()

  let squadre = []
  let iscrizioni = []
  let valutazioni = []

  if (stagione) {
    const [sq, isc, val] = await Promise.all([
      supabase.from('squadre').select('id, nome, ordine').order('ordine'),
      supabase.from('iscrizioni')
        .select('squadra_id, numero_maglia, portieri(id, nome, cognome, foto_url, attivo, data_nascita)')
        .eq('stagione_id', stagione.id),
      supabase.from('valutazioni').select('portiere_id, presente, voto'),
    ])
    squadre = sq.data ?? []
    iscrizioni = isc.data ?? []
    valutazioni = val.data ?? []
  }

  const stats = {}
  for (const v of valutazioni) {
    const s = (stats[v.portiere_id] ??= { tot: 0, presenze: 0, somma: 0, conta: 0 })
    s.tot += 1
    if (v.presente) s.presenze += 1
    if (v.presente && v.voto != null) { s.somma += Number(v.voto); s.conta += 1 }
  }
  const media = (id) => { const s = stats[id]; return s && s.conta ? (s.somma / s.conta).toFixed(2) : '—' }
  const presenzePct = (id) => { const s = stats[id]; return s && s.tot ? Math.round((s.presenze / s.tot) * 100) + '%' : '—' }

  const perCategoria = (sqId) => iscrizioni.filter((i) => i.squadra_id === sqId && i.portieri?.attivo)
  const totale = iscrizioni.filter((i) => i.portieri?.attivo).length

  return (
    <>
      <div className="topbar topbar-row">
        <div>
          <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
          <h1>Portieri</h1>
        </div>
        <Link href="/portieri/nuovo" className="btn-azione">+ Nuovo portiere</Link>
      </div>
      <div className="content">
        <Guida titolo="Come gestire i portieri">
          Aggiungi i portieri con &ldquo;+ Nuovo portiere&rdquo; e iscrivili a una categoria (squadra) della stagione attiva.
          Dalla scheda di ogni portiere puoi modificare dati anagrafici, impostare obiettivi e vedere le statistiche di stagione.
          Per mandare l&apos;accesso al portiere, usa la sezione <a href="/inviti" className="link-inline">Inviti</a>.
        </Guida>
        {squadre.map((sq) => {
          const lista = perCategoria(sq.id)
          if (lista.length === 0) return null
          return (
            <section key={sq.id}>
              <div className="squadra-head">
                <h2>{sq.nome}</h2>
                <span className="conta">{lista.length} portieri</span>
              </div>
              <div className="grid">
                {lista.map((i) => {
                  const p = i.portieri
                  const eta = calcEta(p.data_nascita)
                  return (
                    <Link className="card-portiere" key={p.id} href={`/portieri/${p.id}`}>
                      <div className="card-top">
                        <div className="avatar">
                          {p.foto_url
                            ? <img src={p.foto_url} alt="" />
                            : <span>{(p.nome?.[0] ?? '') + (p.cognome?.[0] ?? '')}</span>}
                        </div>
                        <div>
                          <div className="nome">
                            {p.nome} {p.cognome ?? ''}
                            {i.numero_maglia ? <span className="maglia">#{i.numero_maglia}</span> : null}
                          </div>
                          <div className="ruolo">
                            {sq.nome}
                            {eta != null && <span className="eta-badge">{eta} anni</span>}
                          </div>
                        </div>
                      </div>
                      <div className="stat-row">
                        <div className="stat">
                          <div className="num voto">{media(p.id)}</div>
                          <div className="lab">Media voto</div>
                        </div>
                        <div className="stat">
                          <div className="num">{presenzePct(p.id)}</div>
                          <div className="lab">Presenze</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
        {totale === 0 && (
          <div className="empty">
            Nessun portiere iscritto a questa stagione.<br />
            <Link href="/portieri/nuovo" className="link-inline">Aggiungi il primo portiere</Link>
          </div>
        )}
      </div>
    </>
  )
}
