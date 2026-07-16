import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient as createPublicClient } from '@supabase/supabase-js'

// Pagina pubblica al 100% (nessuna personalizzazione per chi e' loggato), letta
// anche dai motori di ricerca — cache di 5 minuti invece di rigenerare a ogni visita.
export const revalidate = 300

function getPublicClient() {
  return createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// ATTENZIONE, storia di questo file: prima qui si faceva .from('profili').select(...)
// con il client anonimo. Ma le RLS non permettono ad anon di leggere profili: la
// select tornava zero righe SENZA errore, quindi scattava notFound() e la pagina
// rispondeva 404 a tutti — utenti sloggati e Googlebot compresi. Ora si passa dalla
// RPC profilo_allenatore_pubblico (SECURITY DEFINER), che restituisce solo i campi
// pubblici. Il telefono NON e' fra questi: resta dietro il paywall.
async function getProfiloPubblico(id) {
  const supabase = getPublicClient()
  const { data, error } = await supabase.rpc('profilo_allenatore_pubblico', { p_id: id })
  if (error) {
    console.error('[allenatore] RPC profilo_allenatore_pubblico:', error.message)
    return null
  }
  return data?.[0] ?? null
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const profilo = await getProfiloPubblico(id)

  if (!profilo) return { title: 'Allenatore non trovato' }

  const nome = profilo.nome_completo || 'Allenatore'
  const desc = profilo.bio
    ? profilo.bio.slice(0, 155)
    : `Preparatore portieri${profilo.citta ? ' a ' + profilo.citta : ''}. Scopri esperienze e certificazioni su GKSeason.`

  return {
    title: `${nome}${profilo.citta ? ' — ' + profilo.citta : ''}`,
    description: desc,
    alternates: { canonical: `/allenatori/${id}` },
    openGraph: {
      title: `${nome} | Preparatore portieri`,
      description: desc,
      images: profilo.foto_url ? [profilo.foto_url] : undefined,
    },
  }
}

export default async function ProfiloAllenatorePublicPage({ params }) {
  const { id } = await params
  const profilo = await getProfiloPubblico(id)

  // La RPC filtra gia' per ruolo allenatore/staff: se torna una riga, e' valida.
  if (!profilo) notFound()

  const supabase = getPublicClient()

  // funzionalita_config e' leggibile da anon, qui il client normale va bene.
  const { data: feeImporto } = await supabase
    .from('funzionalita_config')
    .select('label')
    .eq('chiave', 'fee_contatto_importo')
    .maybeSingle()
  const importoFee = feeImporto?.label ?? '2,90'

  const esperienze = Array.isArray(profilo.esperienze) ? profilo.esperienze.filter(Boolean) : []
  const certificati = Array.isArray(profilo.certificati) ? profilo.certificati.filter(Boolean) : []
  const nome = profilo.nome_completo || 'Allenatore'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nome,
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
        <div className="stat-foto" style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          {profilo.foto_url
            ? <Image src={profilo.foto_url} alt={`${nome}, preparatore portieri${profilo.citta ? ' a ' + profilo.citta : ''}`} fill sizes="80px" style={{ objectFit: 'cover' }} />
            : <span style={{ fontSize: 28 }}>{nome.charAt(0)}</span>}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>{nome}</h1>
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
