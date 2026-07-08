'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function MieiPreparatoriClient({ preparatoriIniziali }) {
  const router = useRouter()
  const [preparatori, setPreparatori] = useState(preparatoriIniziali)
  const [busy, setBusy] = useState(null) // id preparatore in lavorazione
  const [errore, setErrore] = useState('')

  const attivi = preparatori.filter(p => p.attivo)
  const revocati = preparatori.filter(p => !p.attivo)

  async function revoca(preparatoreId) {
    if (!confirm('Revocare il collegamento con questo preparatore?')) return
    setBusy(preparatoreId)
    setErrore('')
    try {
      const res = await fetch('/api/revoca-supervisione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparatore_id: preparatoreId }),
      })
      if (!res.ok) {
        const json = await res.json()
        setErrore(json.error ?? 'Errore nella revoca')
      } else {
        setPreparatori(prev => prev.map(p =>
          p.preparatore_id === preparatoreId
            ? { ...p, attivo: false, revocato_il: new Date().toISOString() }
            : p
        ))
      }
    } catch (e) {
      setErrore(e.message)
    }
    setBusy(null)
  }

  return (
    <div className="content">
      <p className="sub-intro">
        Qui trovi tutti i preparatori collegati al tuo account. Puoi accedere alla loro area
        per seguire il loro lavoro. Per aggiungere un nuovo preparatore, vai su{' '}
        <Link href="/inviti">Inviti</Link> e crea un invito di tipo <em>Preparatore (supervisione)</em>.
      </p>

      {errore && <div className="err" style={{ marginBottom: 12 }}>{errore}</div>}

      {/* Attivi */}
      <div className="scheda">
        <h3 style={{ marginTop: 0 }}>Collegati ({attivi.length})</h3>
        {attivi.length === 0 && (
          <p className="sub-intro">
            Nessun preparatore collegato ancora.{' '}
            <Link href="/inviti">Crea un invito</Link> di tipo <em>Preparatore</em>.
          </p>
        )}
        {attivi.map((p) => (
          <div key={p.preparatore_id} className="lista-riga" style={{ alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
              background: 'var(--azzurro-chiaro)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {p.foto_url && <Image src={p.foto_url} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />}
              {!p.foto_url && '👤'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nome_completo}</div>
              {p.citta && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.citta}</div>}
              {p.stagione_attiva
                ? <div style={{ fontSize: 12, color: 'var(--verde)' }}>📅 {p.stagione_attiva.nome}</div>
                : <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nessuna stagione attiva</div>
              }
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                Collegato il {new Date(p.collegato_il).toLocaleDateString('it-IT')}
              </div>
            </div>

            {/* Azioni */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link
                href={`/responsabile/preparatore/${p.preparatore_id}`}
                className="btn btn-mini"
                style={{ textDecoration: 'none' }}
              >
                👁 Area
              </Link>
              <button
                className="btn-mini btn-del"
                onClick={() => revoca(p.preparatore_id)}
                disabled={busy === p.preparatore_id}
                type="button"
              >
                {busy === p.preparatore_id ? '...' : 'Revoca'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Revocati */}
      {revocati.length > 0 && (
        <div className="scheda" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Revocati ({revocati.length})</h3>
          {revocati.map((p) => (
            <div key={p.preparatore_id} className="lista-riga assente" style={{ alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'var(--linea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, opacity: 0.5,
              }}>
                👤
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, opacity: 0.6 }}>{p.nome_completo}</div>
                {p.revocato_il && (
                  <div style={{ fontSize: 11, color: 'var(--rosso)' }}>
                    Revocato il {new Date(p.revocato_il).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
