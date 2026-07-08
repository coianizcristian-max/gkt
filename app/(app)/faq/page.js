import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function raggruppa(righe) {
  const gruppi = []
  for (const r of righe) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.categoria === r.categoria) ultimo.domande.push(r)
    else gruppi.push({ categoria: r.categoria, domande: [r] })
  }
  return gruppi
}

export default async function FaqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  const isPortiere = profilo?.ruolo === 'portiere'

  const { data: righe } = await supabase
    .from('faq_interne').select('*')
    .eq('target', isPortiere ? 'portiere' : 'allenatore')
    .order('categoria').order('ordine')

  const gruppi = raggruppa(righe ?? [])

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Guida</div>
        <h1>Domande frequenti</h1>
      </div>
      <div className="content">
        <p className="sub-intro">Clicca su una domanda per vedere la risposta.</p>
        {gruppi.length === 0 && <div className="empty">Nessuna domanda frequente disponibile al momento.</div>}
        {gruppi.map((g, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>{g.categoria}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.domande.map((d) => (
                <details key={d.id} className="scheda" style={{ padding: '12px 16px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{d.domanda}</summary>
                  <div className="sub-intro" style={{ marginTop: 8, marginBottom: 0 }}>{d.risposta}</div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
