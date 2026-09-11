'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export default function ProfiloModal({ allenatoreId, onClose }) {
  const [profilo, setProfilo] = useState(null)
  const [gating, setGating] = useState(null) // { a_pagamento, free, importo }
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('profilo') // 'profilo' | 'contatto'
  const t = useTranslations('profiloModal')

  // Chiudi con ESC
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Blocca scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function carica() {
      try {
        const res = await fetch(`/api/profilo-pubblico?id=${allenatoreId}`)
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        setProfilo(json.profilo ?? null)
        setGating(json.gating ?? { free: true, importo: '2.90' })
      } catch (_) { /* rete */ }
      setLoading(false)
    }
    carica()
  }, [allenatoreId])

  const esperienze = Array.isArray(profilo?.esperienze) ? profilo.esperienze.filter(Boolean) : []
  const certificati = Array.isArray(profilo?.certificati) ? profilo.certificati.filter(Boolean) : []
  const contattoGratuito = gating?.free !== false || parseFloat(gating?.importo) === 0

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(20,32,43,0.55)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '90vh', overflowY: 'auto', pointerEvents: 'all',
          boxShadow: '0 8px 40px rgba(20,32,43,0.22)',
        }}>
          {/* Header sticky */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderBottom: '1px solid var(--linea)',
            position: 'sticky', top: 0, background: '#fff', zIndex: 2, borderRadius: '16px 16px 0 0',
          }}>
            {vista === 'profilo' ? (
              <span style={{ fontWeight: 700, fontSize: 16 }}>{t('titoloProfilo')}</span>
            ) : (
              <button
                onClick={() => setVista('profilo')}
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--azzurro)', fontWeight: 600, fontSize: 14, padding: 0 }}
              >{t('tornaProfilo')}</button>
            )}
            <button
              onClick={onClose}
              type="button"
              aria-label={t('chiudi')}
              style={{
                background: 'var(--carta)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>{t('caricamento')}</div>
          ) : !profilo ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>{t('nonTrovato')}</div>
          ) : vista === 'profilo' ? (
            <ProfiloVista
              profilo={profilo}
              esperienze={esperienze}
              certificati={certificati}
              contattoGratuito={contattoGratuito}
              importo={gating?.importo}
              onContatta={() => setVista('contatto')}
            />
          ) : (
            <ContattoVista
              allenatoreId={allenatoreId}
              nomeAllenatore={profilo.nome_completo}
              contattoGratuito={contattoGratuito}
              importo={gating?.importo}
              onSuccess={() => setVista('inviato')}
            />
          )}

          {vista === 'inviato' && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ margin: '0 0 8px' }}>{t('inviata')}</h2>
              <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>{t('inviataTesto')}</p>
              <button className="btn" onClick={onClose} type="button">{t('chiudi')}</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ProfiloVista({ profilo, esperienze, certificati, contattoGratuito, importo, onContatta }) {
  const t = useTranslations('profiloModal')
  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Header profilo */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
          background: 'var(--azzurro)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {profilo.foto_url
            ? <Image src={profilo.foto_url} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
            : <span style={{ fontSize: 24, color: '#fff', fontWeight: 700 }}>{(profilo.nome_completo || '?').charAt(0)}</span>}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{profilo.nome_completo || t('allenatoreFallback')}</h2>
          {profilo.citta && (
            <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>
              📍 {profilo.citta}
            </p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--campo)', fontWeight: 600 }}>{t('ruolo')}</p>
        </div>
      </div>

      {/* Bio */}
      {profilo.bio && (
        <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--carta)', borderRadius: 10 }}>
          <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.65, fontSize: 14 }}>{profilo.bio}</p>
        </div>
      )}

      {/* Esperienze */}
      {esperienze.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink)' }}>{t('esperienze')}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.9, color: 'var(--ink-soft)', fontSize: 14 }}>
            {esperienze.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Certificati */}
      {certificati.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink)' }}>{t('certificati')}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.9, color: 'var(--ink-soft)', fontSize: 14 }}>
            {certificati.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {!esperienze.length && !certificati.length && !profilo.bio && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, fontStyle: 'italic', marginBottom: 16 }}>{t('nessunaInfo')}</p>
      )}

      {/* CTA contatto */}
      <div style={{
        marginTop: 8, padding: '16px', background: 'var(--carta)',
        borderRadius: 10, border: '1px solid var(--linea)',
      }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14 }}>
          {contattoGratuito ? t('contattaTitolo') : t('contattaTitoloPag', { importo })}
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
          {contattoGratuito ? t('contattaDescGratis') : t('contattaDescPag', { importo })}
        </p>
        <button className="btn" onClick={onContatta} type="button" style={{ width: '100%' }}>
          {contattoGratuito ? t('ctaGratis') : t('ctaPag', { importo })}
        </button>
      </div>
    </div>
  )
}

function ContattoVista({ allenatoreId, nomeAllenatore, contattoGratuito, importo, onSuccess }) {
  const [f, setF] = useState({ nome: '', email: '', telefono: '', societa: '', messaggio: '' })
  const t = useTranslations('profiloModal')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function invia(e) {
    e.preventDefault()
    if (!f.nome.trim() || !f.email.trim() || !f.messaggio.trim()) {
      setErr(t('erroreObbligatori')); return
    }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/invia-contatto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allenatoreId, ...f }),
      })
      const body = await res.json()
      if (!res.ok) { setErr(body.error ?? t('erroreInvio')); setLoading(false); return }
      onSuccess()
    } catch { setErr(t('erroreRete')); setLoading(false) }
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{t('scriviA', { nome: nomeAllenatore })}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ink-soft)' }}>
        {t('scriviDesc')}
        {!contattoGratuito && <><br /><b>{t('contributoRichiesto', { importo })}</b></>}
      </p>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <form onSubmit={invia}>
        <div className="field">
          <label>{t('labelNome')}</label>
          <input value={f.nome} onChange={upd('nome')} placeholder={t('phNome')} required />
        </div>
        <div className="field">
          <label>{t('labelEmail')} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>{t('labelEmailHint')}</span></label>
          <input type="email" value={f.email} onChange={upd('email')} placeholder={t('phEmail')} required />
        </div>
        <div className="field">
          <label>{t('labelTelefono')} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>{t('facoltativo')}</span></label>
          <input type="tel" value={f.telefono} onChange={upd('telefono')} placeholder={t('phTelefono')} />
        </div>
        <div className="field">
          <label>{t('labelSocieta')} <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>{t('facoltativo')}</span></label>
          <input value={f.societa} onChange={upd('societa')} placeholder={t('phSocieta')} />
        </div>
        <div className="field">
          <label>{t('labelRichiesta')}</label>
          <textarea
            value={f.messaggio}
            onChange={upd('messaggio')}
            rows={5}
            placeholder={t('phMessaggio')}
            required
            style={{ width: '100%', resize: 'vertical', minHeight: 100 }}
          />
        </div>
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? t('invioCorso') : contattoGratuito ? t('inviaRichiesta') : t('inviaRichiestaPag', { importo })}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center' }}>{t('consenso')}</p>
      </form>
    </div>
  )
}
