'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const STEP_ANNO = 1
const STEP_SOCIETA = 2
const STEP_DATE = 3
const STEP_CATEGORIE = 4

export default function SetupWizard({ anniDisponibili, ownerId, redirectAfter = '/dashboard', isNuova = false }) {
  const t = useTranslations('setupWizard')
  const router = useRouter()
  const [step, setStep] = useState(STEP_ANNO)
  const [anno, setAnno] = useState(null)
  const [societa, setSocieta] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [categorie, setCategorie] = useState([''])
  const [renderAttiva, setRenderAttiva] = useState(!isNuova)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (step === STEP_ANNO) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">{t('step1')}</div>
            <h2>{isNuova ? t('titoloNuova') : t('titoloBenvenuto')}</h2>
            <p className="sub-intro">{isNuova ? t('introNuova') : t('introBenvenuto')}</p>
          </div>

          <h3 className="wizard-sezione">{t('selezionaAnno')}</h3>
          <div className="wizard-anni">
            {anniDisponibili.map((a) => (
              <button key={a.id} type="button" className={`wizard-anno-btn ${anno?.id === a.id ? 'selected' : ''}`} onClick={() => setAnno(a)}>
                {a.nome}
              </button>
            ))}
          </div>

          {isNuova && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
              <input type="checkbox" checked={renderAttiva} onChange={(e) => setRenderAttiva(e.target.checked)} />
              {t('passaSubito')}
            </label>
          )}

          <div className="wizard-footer">
            {isNuova && (
              <button className="btn-ghost" type="button" onClick={() => router.back()}>{t('annulla')}</button>
            )}
            <button className="btn" disabled={!anno} onClick={() => setStep(STEP_SOCIETA)} type="button">{t('continua')}</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === STEP_SOCIETA) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">{t('step2', { anno: anno.nome })}</div>
            <h2>{t('nomeSocietaTitolo')}</h2>
            <p className="sub-intro">{t('nomeSocietaIntro')}</p>
          </div>

          <div className="field">
            <label>{t('nomeSocietaLabel')}</label>
            <input value={societa} onChange={(e) => setSocieta(e.target.value)} placeholder={t('phSocieta')} autoFocus />
          </div>

          <div className="wizard-footer">
            <button className="btn-ghost" onClick={() => setStep(STEP_ANNO)} type="button">{t('indietro')}</button>
            <button className="btn" disabled={!societa.trim()} onClick={() => setStep(STEP_DATE)} type="button">{t('continua')}</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === STEP_DATE) {
    return (
      <div className="wizard-wrap">
        <div className="wizard-box">
          <div className="wizard-header">
            <div className="wizard-step-indicator">{t('step3', { societa, anno: anno.nome })}</div>
            <h2>{t('dateTitolo')}</h2>
            <p className="sub-intro">{t('dateIntro')}</p>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t('dataInizio')}</label>
              <input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('dataFine')}</label>
              <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
            </div>
          </div>

          <p className="sub-intro" style={{ fontSize: 12, marginTop: 4 }}>{t('dateFacoltative')}</p>

          <div className="wizard-footer">
            <button className="btn-ghost" onClick={() => setStep(STEP_SOCIETA)} type="button">{t('indietro')}</button>
            <button className="btn" onClick={() => setStep(STEP_CATEGORIE)} type="button">{t('continua')}</button>
          </div>
        </div>
      </div>
    )
  }

  function aggiungiCategoria() { setCategorie((p) => [...p, '']) }
  function rimuoviCategoria(idx) { setCategorie((p) => p.filter((_, i) => i !== idx)) }
  function aggiornaCategoria(idx, val) { setCategorie((p) => p.map((c, i) => i === idx ? val : c)) }

  async function crea() {
    const catValide = categorie.map((c) => c.trim()).filter(Boolean)
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/crea-stagione', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annoNome: anno.nome, societa: societa.trim(), dataInizio: dataInizio || null, dataFine: dataFine || null, categorie: catValide, renderAttiva }),
      })
      const body = await res.json()
      if (!res.ok) { setErr(body.error ?? t('errore')); setBusy(false); return }
      window.location.href = redirectAfter
    } catch (e) { setErr(t('erroreRete')); setBusy(false) }
  }

  return (
    <div className="wizard-wrap">
      <div className="wizard-box">
        <div className="wizard-header">
          <div className="wizard-step-indicator">{t('step4', { societa, anno: anno.nome })}</div>
          <h2>{t('categorieTitolo')}</h2>
          <p className="sub-intro">{t('categorieIntro')}</p>
        </div>

        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {categorie.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8 }}>
              <input value={c} onChange={(e) => aggiornaCategoria(idx, e.target.value)} placeholder={t('phCategoria', { n: idx + 1 })} style={{ flex: 1 }} autoFocus={idx === categorie.length - 1} />
              {categorie.length > 1 && (
                <button className="btn-mini btn-del" type="button" onClick={() => rimuoviCategoria(idx)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <button className="btn-ghost" type="button" onClick={aggiungiCategoria} style={{ marginBottom: 12 }}>{t('aggiungiCategoria')}</button>

        <p className="sub-intro" style={{ fontSize: 12 }}>{t('categorieFacoltative')}</p>

        {renderAttiva && isNuova && (
          <div className="err" style={{ marginTop: 12, background: 'rgba(10,126,194,0.10)', borderColor: 'var(--azzurro)', color: 'var(--azzurro)' }}>
            {t('passeraiSubito')}
          </div>
        )}

        <div className="wizard-footer">
          <button className="btn-ghost" onClick={() => setStep(STEP_DATE)} type="button">{t('indietro')}</button>
          <button className="btn" onClick={crea} disabled={busy} type="button">{busy ? t('creazione') : t('creaStagione')}</button>
        </div>
      </div>
    </div>
  )
}
