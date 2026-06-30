import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: profilo } = await supabase
    .from('profili')
    .select('nome_completo, bio, citta, foto_url')
    .eq('id', id)
    .maybeSingle()

  if (!profilo) return { title: 'Allenatore non trovato' }

  const nome = profilo.nome_completo || 'Allenatore'
  const desc = profilo.bio
    ? profilo.bio.slice(0, 155)
    : `Preparatore portieri${profilo.citta ? ' a ' + profilo.citta : ''}. Scopri esperienze e certificazioni su GKSeason.`

  return {
    title: `${nome}${profilo.citta ? ' — ' + profilo.citta : ''}`,
    description: desc,
    openGraph: {
      title: `${nome} | Preparatore portieri`,
      description: desc,
      images: profilo.foto_url ? [profilo.foto_url] : undefined,
    },
  }
}

export default async function ProfiloAllenatorePublicPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profilo } = await supabase
    .from('profili')
    .select('id, nome_completo, bio, foto_url, citta, esperienze, certificati, disponibile, ruolo')
    .eq('id', id)
    .maybeSingle()

  // Nota: il filtro "disponibile" è già applicato dalla RPC cerca_allenatori che genera i risultati.
  // Qui controlliamo solo che il profilo esista e sia di tipo corretto, per evitare falsi 404
  // quando il campo disponibile non è stato impostato esplicitamente nel DB.
  if (!profilo || (profilo.ruolo !== 'allenatore' && profilo.ruolo !== 'staff')) notFound()

  // Fee contatto dal config supervisore
  const { data: feeRow } = await supabase
    .from('funzionalita_config')
    .select('free')
    .eq('chiave', 'contatto_allenatore')
    .maybeSingle()
  const feeAmount = feeRow?.free ?? null // null = feature non configurata

  const { data: feeImporto } = await supabase
    .from('funzionalita_config')
    .select('label')
    .eq('chiave', 'fee_contatto_importo')
    .maybeSingle()
  const importoFee = feeImporto?.label ?? '2,90'

  const esperienze = Array.isArray(profilo.esperienze) ? profilo.esperienze.filter(Boolean) : []
  const certificati = Array.isArray(profilo.certificati) ? profilo.certificati.filter(Boolean) : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profilo.nome_completo || 'Allenatore',
    jobTitle: 'Preparatore portieri',
    address: profilo.citta ? { '@type': 'PostalAddress', addressLocality: profilo.citta, addressCountry: 'IT' } : undefined,
    description: profilo.bio || undefined,
    image: profilo.foto_url || undefined,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/cerca-allenatori" className="link-inline" style={{ fontSize: 13 }}>← Torna alla ricerca</Link>

      {/* Header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', margin: '24px 0 28px' }}>
        <div className="stat-foto" style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          {profilo.foto_url
            ? <img src={profilo.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 28 }}>{(profilo.nome_completo || '?').charAt(0)}</span>}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>{profilo.nome_completo || 'Allenatore'}</h1>
          {profilo.citta && (
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
              📍 {profilo.citta}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profilo.bio && (
        <div className="scheda" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Bio</h2>
          <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{profilo.bio}</p>
        </div>
      )}

      {/* Esperienze */}
      {esperienze.length > 0 && (
        <div className="scheda" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Esperienze</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8, color: 'var(--ink-soft)' }}>
            {esperienze.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Certificati */}
      {certificati.length > 0 && (
        <div className="scheda" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Certificati e attestati</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8, color: 'var(--ink-soft)' }}>
            {certificati.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Contatto — dati nascosti dietro fee */}
      <div className="scheda" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Contatta questo allenatore</h2>
        <div style={{ background: 'var(--carta)', border: '1px solid var(--linea)', borderRadius: 'var(--r)', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 28 }}>🔒</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Numero di telefono ed email riservati</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              Per vedere i contatti diretti di questo allenatore è richiesto un contributo di <b>€ {importoFee}</b>.
            </p>
          </div>
          <Link href={`/allenatori/${id}/contatto`} className="btn" style={{ flexShrink: 0 }}>
            Sblocca contatti
          </Link>
        </div>
      </div>
    </div>
  )
}
