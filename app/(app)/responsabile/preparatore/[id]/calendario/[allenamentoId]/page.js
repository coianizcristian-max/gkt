import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function SupervisioneAllenamento({ params }) {
  const { id: preparatoreId, allenamentoId } = await params

  // Verifica supervisore
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const admin = getAdmin()
  const { data: rel } = await admin
    .from('relazioni_supervisione').select('id')
    .eq('supervisore_id', user.id).eq('preparatore_id', preparatoreId).eq('attivo', true).maybeSingle()
  if (!rel) notFound()

  const basePath = `/responsabile/preparatore/${preparatoreId}`

  // Carica allenamento
  const { data: all } = await admin
    .from('allenamenti')
    .select('*, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
    .eq('id', allenamentoId).maybeSingle()
  if (!all) notFound()

  const dataLabel = new Date(all.data + 'T00:00:00')
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Accorpamento
  let accorpataConId = null
  let accorpataConNome = null
  if (all.accorpata_con) {
    const { data: checkAll } = await admin.from('allenamenti').select('id, squadra:squadre!allenamenti_squadra_id_fkey(nome)').eq('id', all.accorpata_con).maybeSingle()
    if (checkAll) { accorpataConId = checkAll.id; accorpataConNome = checkAll.squadra?.nome }
    else {
      const { data: altroAll } = await admin.from('allenamenti').select('id, squadra:squadre!allenamenti_squadra_id_fkey(nome)')
        .eq('stagione_id', all.stagione_id).eq('squadra_id', all.accorpata_con).eq('data', all.data).maybeSingle()
      if (altroAll) { accorpataConId = altroAll.id; accorpataConNome = altroAll.squadra?.nome }
    }
  }
  const allenamIdEsercizi = accorpataConId ?? allenamentoId

  // Carica tutto in parallelo
  const [
    { data: iscr },
    { data: parametri },
    { data: vals },
    { data: aeRows },
    { data: feedbackRows },
    { data: punteggiRows },
  ] = await Promise.all([
    admin.from('iscrizioni').select('portieri(id, nome, cognome)')
      .eq('stagione_id', all.stagione_id).eq('squadra_id', all.squadra_id),
    admin.from('parametri_valutazione').select('id, nome, ordine').eq('attivo', true).order('ordine'),
    admin.from('valutazioni').select('id, portiere_id, presente, voto, note').eq('allenamento_id', allenamentoId),
    admin.from('allenamento_esercizi')
      .select('esercizio_id, ordine, esercizi(id, titolo, tipologia, descrizione_breve, descrizione, immagine_url, video_url, durata_minuti, recupero_minuti)')
      .eq('allenamento_id', allenamIdEsercizi).order('ordine'),
    admin.from('valutazioni')
      .select('portiere_id, feedback_portiere, nota_portiere, voto_portiere, presente, portieri(nome, cognome)')
      .eq('allenamento_id', allenamentoId).not('feedback_portiere', 'is', null),
    admin.from('valutazione_punteggi')
      .select('valutazione_id, parametro_id, punteggio')
      .in('valutazione_id', []), // placeholder, riempiamo sotto
  ])

  const valIds = (vals ?? []).map(v => v.id)
  let punteggi = []
  if (valIds.length > 0) {
    const { data: pp } = await admin.from('valutazione_punteggi')
      .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', valIds)
    punteggi = pp ?? []
  }

  const portieri = (iscr ?? []).map(r => r.portieri).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome))
  const esercizi = (aeRows ?? []).map(r => r.esercizi).filter(Boolean)
  const totaleMinuti = esercizi.reduce((t, e) => t + (parseFloat(e.durata_minuti) || 0) + (parseFloat(e.recupero_minuti) || 0), 0)

  // Mappa valutazioni per portiere
  const valMap = {}
  for (const v of vals ?? []) valMap[v.portiere_id] = v
  const punteggiMap = {}
  for (const p of punteggi) {
    if (!punteggiMap[p.valutazione_id]) punteggiMap[p.valutazione_id] = {}
    punteggiMap[p.valutazione_id][p.parametro_id] = p.punteggio
  }

  const feedback = (feedbackRows ?? []).filter(r => r.feedback_portiere || r.nota_portiere)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">
          <Link href={`${basePath}/calendario`}>← Calendario</Link>
        </div>
        <h1>
          {all.squadra?.nome}
          {accorpataConNome && <span style={{ fontWeight: 400, fontSize: '0.65em', color: 'var(--ink-soft)', marginLeft: 8 }}>/ {accorpataConNome}</span>}
          <span className="topbar-sub"> · {dataLabel}</span>
        </h1>
      </div>
      <div className="content">

        {/* Info allenamento */}
        <div className="scheda" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Dettaglio</h3>
          <div className="form-grid">
            {all.ora_inizio && (
              <div><label className="campo-label">Orario</label>
                <div className="campo-valore">{all.ora_inizio?.slice(0,5)}{all.ora_fine ? ` → ${all.ora_fine.slice(0,5)}` : ''}</div>
              </div>
            )}
            {all.obiettivi && (
              <div><label className="campo-label">Obiettivi</label>
                <div className="campo-valore" style={{ whiteSpace: 'pre-wrap' }}>{all.obiettivi}</div>
              </div>
            )}
            {all.consuntivo && (
              <div><label className="campo-label">Consuntivo</label>
                <div className="campo-valore" style={{ whiteSpace: 'pre-wrap' }}>{all.consuntivo}</div>
              </div>
            )}
            {all.note && (
              <div><label className="campo-label">Note</label>
                <div className="campo-valore" style={{ whiteSpace: 'pre-wrap' }}>{all.note}</div>
              </div>
            )}
          </div>
        </div>

        {/* Esercizi */}
        <div className="scheda" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            Esercizi ({esercizi.length})
            {totaleMinuti > 0 && (
              <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--ink-soft)', marginLeft: 8 }}>
                ⏱ {totaleMinuti >= 60 ? `${Math.floor(totaleMinuti/60)}h ${Math.round(totaleMinuti%60)}min` : `${Math.round(totaleMinuti)} min`}
              </span>
            )}
          </h3>
          {esercizi.length === 0
            ? <div className="empty">Nessun esercizio pianificato.</div>
            : <div className="es-seduta-grid">
                {esercizi.map((e, i) => (
                  <details key={e.id} className="es-seduta-card">
                    <summary>
                      {e.immagine_url && <img src={e.immagine_url} className="es-seduta-thumb" alt="" />}
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginRight: 6 }}>{i + 1}.</span>
                        <span className="es-seduta-titolo">{e.titolo}</span>
                        {e.tipologia && <span className="stat-cat" style={{ marginLeft: 6 }}>{e.tipologia}</span>}
                        {(e.durata_minuti || e.recupero_minuti) && (
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
                            {e.durata_minuti ? `${e.durata_minuti}min` : ''}
                            {e.recupero_minuti ? ` +${e.recupero_minuti}min rec.` : ''}
                          </span>
                        )}
                      </div>
                    </summary>
                    {(e.descrizione_breve || e.descrizione) && (
                      <div className="es-seduta-body">
                        {e.descrizione_breve && <p><em>{e.descrizione_breve}</em></p>}
                        {e.descrizione && <p>{e.descrizione}</p>}
                      </div>
                    )}
                    {e.video_url && (
                      <div className="es-seduta-body">
                        <a href={e.video_url} target="_blank" rel="noopener noreferrer" className="btn-mini">▶ Video</a>
                      </div>
                    )}
                  </details>
                ))}
              </div>
          }
        </div>

        {/* Valutazioni */}
        {!all.nessuna_valutazione && portieri.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Valutazioni portieri</h3>
            {portieri.map(p => {
              const v = valMap[p.id]
              const punti = v ? (punteggiMap[v.id] ?? {}) : {}
              return (
                <div key={p.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div style={{ fontWeight: 600, flex: 1 }}>{p.nome} {p.cognome ?? ''}</div>
                    {v?.presente === false && <span style={{ fontSize: 12, color: 'var(--rosso)' }}>Assente</span>}
                    {v?.presente === true && v?.voto != null && (
                      <span style={{ fontWeight: 700, fontSize: 16 }}>⭐ {v.voto}</span>
                    )}
                    {!v && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Non valutato</span>}
                  </div>
                  {v?.presente && (parametri ?? []).length > 0 && Object.keys(punti).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 4 }}>
                      {(parametri ?? []).map(par => {
                        const pt = punti[par.id]
                        if (pt == null) return null
                        return (
                          <span key={par.id} style={{ fontSize: 12, background: 'var(--sfondo)', borderRadius: 4, padding: '2px 8px' }}>
                            {par.nome}: <b>{pt}</b>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {v?.note && <div style={{ fontSize: 13, color: 'var(--ink-soft)', paddingLeft: 4 }}>{v.note}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Feedback portieri */}
        {feedback.length > 0 && (
          <div className="scheda" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Feedback portieri</h3>
            {feedback.map((r, i) => (
              <div key={i} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{r.portieri?.nome} {r.portieri?.cognome ?? ''}</div>
                {r.feedback_portiere && <div style={{ fontSize: 13 }}>💬 {r.feedback_portiere}</div>}
                {r.nota_portiere && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>📝 {r.nota_portiere}</div>}
                {r.voto_portiere != null && <div style={{ fontSize: 13 }}>Autovalutazione: <b>{r.voto_portiere}</b></div>}
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}
