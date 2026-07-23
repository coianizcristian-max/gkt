import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getUser } from '@/lib/supabase/server'
import Guida from '@/app/components/Guida'
import PaywallBanner from '@/app/components/PaywallBanner'
import { getGatingConfig, hasAbbonamento, isUnlocked } from '@/lib/gating'
import RicorrenzeTabs from '@/app/components/RicorrenzeTabs'
import { getStagioneAttiva } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function RicorrenzePage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect('/login')
  const { data: profilo } = await supabase.from('profili').select('ruolo').eq('id', user.id).maybeSingle()
  if (!(profilo?.ruolo === 'allenatore' || profilo?.ruolo === 'staff')) redirect('/')

  const { stagione } = await getStagioneAttiva(supabase, user.id)

  // Il gating non dipende dalla stagione: partiva solo dopo il blocco sotto,
  // qui viene lanciato subito e atteso solo quando serve.
  const gatingPromise = Promise.all([
    getGatingConfig(supabase),
    hasAbbonamento(supabase, user.id),
  ])

  let categorie = []
  let ricorrenze = []
  let ricorrenzePartite = []
  if (stagione) {
    const [cat, ric, ricPar] = await Promise.all([
      supabase.from('stagione_categorie').select('squadre(id, nome, ordine)').eq('stagione_id', stagione.id),
      supabase.from('ricorrenze_stagionali').select('*').eq('stagione_id', stagione.id)
        .order('giorno_settimana').order('ora_inizio'),
      supabase.from('ricorrenze_partite_stagionali').select('*').eq('stagione_id', stagione.id)
        .order('giorno_settimana').order('data_inizio_ric'),
    ])
    categorie = (cat.data ?? []).map((r) => r.squadre).filter(Boolean).sort((a, b) => a.ordine - b.ordine)
    ricorrenze = ric.data ?? []
    ricorrenzePartite = ricPar.data ?? []
  }

  const [gatingCfg, abbAttivo] = await gatingPromise
  const canRicorrenze = isUnlocked('ricorrenze_genera', gatingCfg, abbAttivo)

  return (
    <>
      <div className="topbar">
        <div className="eyebrow">Stagione {stagione?.nome ?? '—'}</div>
        <h1>Ricorrenze</h1>
      </div>
      <div className="content">
        <Guida titolo="Come funzionano le ricorrenze">
          <p>
            <strong>Prima di tutto</strong>: le ricorrenze funzionano solo sulle categorie <strong>attive</strong> nella
            stagione corrente. Se questa pagina ti sembra vuota, vai su{' '}
            <Link href="/categorie" className="link-inline">Le mie categorie</Link> e assicurati di aver
            spuntato &ldquo;Attiva in stagione&rdquo; per almeno una categoria.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Allenamenti</strong>: imposta per ogni categoria il giorno e l&apos;orario fisso di
            allenamento settimanale, poi genera automaticamente tutte le date nel calendario. Le date già
            presenti non vengono duplicate: puoi rigenerare senza problemi dopo modifiche.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Partite</strong>: due modi per compilare il calendario partite. Il{' '}
            <strong>Metodo 1</strong> genera partite vuote (solo data e categoria) in un giorno fisso della
            settimana, utile quando conosci solo il giorno di gioco e vuoi velocizzare l&apos;inserimento —
            avversario e casa/trasferta li aggiungi dopo aprendo la partita. Il <strong>Metodo 2</strong>{' '}
            importa un calendario ufficiale già completo da un file Excel: scarica il template dalla
            sezione, compilalo con date, avversari e casa/trasferta di andata, poi caricalo selezionando la
            categoria — il programma crea automaticamente sia le partite di andata che quelle di ritorno
            (invertendo casa/trasferta).
          </p>
          <p style={{ marginTop: 10 }}>
            Nella sezione <strong>🗑 Eliminazione massiva</strong> in fondo alla pagina puoi cancellare
            in blocco allenamenti o partite in un intervallo di date. Puoi filtrare per categoria,
            scegliere se eliminare solo quelli <em>senza valutazioni</em> (tipicamente inseriti per
            errore), solo quelli <em>con valutazioni</em>, oppure tutti indistintamente.
            L&apos;operazione è irreversibile: viene sempre richiesta una conferma prima di procedere.
          </p>
        </Guida>
        {stagione && categorie.length === 0 && (
          <div className="avviso">
            <span aria-hidden="true">⚠️</span>
            <span>
              Non hai ancora nessuna categoria attiva per la stagione <strong>{stagione.nome}</strong>, quindi
              qui non vedrai nulla da generare. Vai su{' '}
              <Link href="/categorie">Le mie categorie</Link> e attivane almeno una.
            </span>
          </div>
        )}
        {stagione
          ? (canRicorrenze
            ? <RicorrenzeTabs stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} ricorrenzePartite={ricorrenzePartite} />
            : <PaywallBanner chiave="ricorrenze_genera" label="Generazione automatica ricorrenze" />)
          : <div className="empty">Nessuna stagione attiva.</div>}
      </div>
    </>
  )
}