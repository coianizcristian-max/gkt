'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }
const STATO_STYLE = {
  attivo:     { bg: 'rgba(46,158,91,0.1)',   color: 'var(--campo)' },
  disdetto:   { bg: 'rgba(230,160,0,0.1)',   color: '#b8860b' },
  scaduto:    { bg: 'rgba(192,57,43,0.1)',   color: 'var(--rosso)' },
  cancellato: { bg: 'rgba(150,150,150,0.1)', color: 'var(--ink-soft)' },
  prova:      { bg: 'rgba(10,126,194,0.1)',  color: 'var(--blu, #0a7ec2)' },
}
// Data (giorno) nel fuso del browser, coerente con fineGiorno qui sotto.
const isoDate = (d) => {
  if (!d) return ''
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
// "fino al 30/06" deve comprendere tutto il 30: salvo le 23:59:59 locali.
const fineGiorno = (yyyyMmDd) => (yyyyMmDd ? new Date(yyyyMmDd + 'T23:59:59').toISOString() : null)
// Riga legata a un abbonamento Stripe ancora vivo (modificarla qui non ferma gli addebiti).
const stripeVivo = (a) => !!a?.stripe_subscription_id && (a.stato === 'attivo' || a.stato === 'disdetto')

export default function AbbonamentiManager({ abbonamenti, profili }) {
  const t = useTranslations('abbonamentiManager')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const fmtData = (d) => d ? new Date(d).toLocaleDateString(dl, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const router = useRouter()
  const [ricerca, setRicerca] = useState('')
  const [editing, setEditing] = useState(null)
  const [nuovoFor, setNuovoFor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const profiliMap = useMemo(() => {
    const m = {}
    for (const p of profili) m[p.id] = p
    return m
  }, [profili])

  const lista = useMemo(() => abbonamenti.map(a => ({
    ...a,
    _nome: profiliMap[a.allenatore_id]?.nome_visualizzato
      || profiliMap[a.allenatore_id]?.nome_completo
      || a.allenatore_id,
    _email: profiliMap[a.allenatore_id]?.email || null,
  })), [abbonamenti, profiliMap])

  const filtrati = useMemo(() => {
    if (!ricerca.trim()) return lista
    const q = ricerca.toLowerCase()
    return lista.filter(a =>
      a._nome?.toLowerCase().includes(q) ||
      a._email?.toLowerCase().includes(q) ||
      a.allenatore_id?.toLowerCase().includes(q)
    )
  }, [lista, ricerca])

  const profiliRicercati = useMemo(() => {
    if (!ricerca.trim()) return []
    const q = ricerca.toLowerCase()
    return profili.filter(p =>
      (p.nome_visualizzato || p.nome_completo || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [profili, ricerca])

  const pianoLabel = (p) => p === 'lifetime' ? t('pianoLifetime') : p === 'annuale' ? t('pianoAnnuale') : p === 'prova' ? t('pianoProva') : t('pianoMensile')

  async function salvaModifica(abb, form) {
    if (stripeVivo(abb) && !confirm(t('avvisoStripeModifica'))) return
    setBusy(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('abbonamenti').update({
      piano: form.piano,
      stato: form.stato,
      scadenza: form.piano === 'lifetime' ? null : fineGiorno(form.scadenza),
      nota: form.nota?.trim() || null,
    }).eq('id', abb.id)
    if (error) { setMsg('✕ ' + t('errore', { msg: error.message })) }
    else { setMsg('✓ ' + t('salvato')); setEditing(null); router.refresh() }
    setBusy(false)
  }

  async function creaNuovo(profiloId, form) {
    // Una riga per persona: se esiste già (es. la prova) la aggiorno.
    const esistente = abbonamenti.find((a) => a.allenatore_id === profiloId)
    if (esistente && stripeVivo(esistente)) { setMsg('✕ ' + t('stripeAttivoBlocco')); return }
    if (esistente && !confirm(t('giaPresenteAggiorno', { stato: t('stato_' + esistente.stato) }))) return
    setBusy(true); setMsg('')
    const supabase = createClient()
    const campi = {
      piano: form.piano,
      stato: form.stato,
      scadenza: form.piano === 'lifetime' ? null : fineGiorno(form.scadenza),
      nota: form.nota?.trim() || null,
    }
    const { error } = esistente
      ? await supabase.from('abbonamenti').update(campi).eq('id', esistente.id)
      : await supabase.from('abbonamenti').insert({ allenatore_id: profiloId, ...campi })
    if (error) { setMsg('✕ ' + t('errore', { msg: error.message })) }
    else { setMsg('✓ ' + t('creato')); setNuovoFor(null); router.refresh() }
    setBusy(false)
  }

  async function eliminaAbb(id) {
    const riga = abbonamenti.find((a) => a.id === id)
    if (stripeVivo(riga) && !confirm(t('avvisoStripeElimina'))) return
    if (!confirm(t('confermaElim'))) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from('abbonamenti').delete().eq('id', id)
    setEditing(null); router.refresh()
    setBusy(false)
  }

  return (
    <div>
      {msg && (
        <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8,
          background: msg.startsWith('✓') ? 'rgba(46,158,91,0.1)' : 'rgba(192,57,43,0.1)',
          color: msg.startsWith('✓') ? 'var(--campo)' : 'var(--rosso)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={ricerca}
          onChange={e => setRicerca(e.target.value)}
          placeholder={t('cerca')}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--linea)', fontSize: 15 }}
        />
        {ricerca && (
          <button type="button" onClick={() => setRicerca('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-soft)' }}>
            ✕
          </button>
        )}
      </div>

      <div className="lista-editor" style={{ marginBottom: 32 }}>
        {filtrati.length === 0 && (
          <div className="empty">{t('nessunAbb')}</div>
        )}
        {filtrati.map((a) => {
          const st = STATO_STYLE[a.stato] ?? { bg: 'var(--carta)', color: 'var(--ink)' }
          const isEditing = editing?.id === a.id

          return (
            <div key={a.id} className="elenco-blocco" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a._nome}</div>
                  {a._email && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{a._email}</div>}
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{a.allenatore_id}</div>
                  <div style={{ fontSize: 13, marginTop: 2, color: 'var(--ink-soft)' }}>
                    {pianoLabel(a.piano)}
                    {a.scadenza && a.piano !== 'lifetime' && ` · ${t('scade', { data: fmtData(a.scadenza) })}`}
                    {' · '}{t('dal', { data: fmtData(a.created_at) })}
                  </div>
                  {a.stripe_subscription_id && <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: '#635bff' }}>💳 {t('stripeBadge')}{stripeVivo(a) ? '' : ' · ' + t('stato_' + a.stato)}</div>}
                  {a.nota && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--ink)', background: 'var(--soft, #f6f8fb)', display: 'inline-block', padding: '2px 8px', borderRadius: 6 }}>📝 {a.nota}</div>}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: st.bg, color: st.color }}>
                  {t('stato_' + a.stato)}
                </span>
                <button className="btn-mini" type="button"
                  onClick={() => setEditing(isEditing ? null : { ...a })}>
                  {isEditing ? t('chiudi') : t('modifica')}
                </button>
              </div>

              {isEditing && (
                <EditForm
                  abb={editing}
                  onSave={(form) => salvaModifica(a, form)}
                  onDelete={() => eliminaAbb(a.id)}
                  onCancel={() => setEditing(null)}
                  busy={busy}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="scheda">
        <h3 style={{ margin: '0 0 12px' }}>{t('attivaTitolo')}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
          {t.rich('attivaIntro', { b: (ch) => <b>{ch}</b> })}
        </p>
        {nuovoFor ? (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {t.rich('nuovoPer', { nome: profiliMap[nuovoFor]?.nome_visualizzato || profiliMap[nuovoFor]?.nome_completo || nuovoFor, b: (ch) => <b>{ch}</b> })}
            </div>
            <EditForm
              abb={{ piano: 'mensile', stato: 'attivo', scadenza: '' }}
              onSave={(form) => creaNuovo(nuovoFor, form)}
              onCancel={() => setNuovoFor(null)}
              busy={busy}
              isNew
            />
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {profiliRicercati.slice(0, 8).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--linea)',
                  background: 'var(--carta)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.nome_visualizzato || p.nome_completo || '—'}</div>
                    {p.email && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.email}</div>}
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{p.id}</div>
                  </div>
                  <button className="btn-mini" type="button" onClick={() => setNuovoFor(p.id)}>
                    {t('attivaBtn')}
                  </button>
                </div>
              ))}
              {profiliRicercati.length === 0 && (
                <div className="empty">
                  {ricerca.trim() ? t('nessunAllenatore') : t('scriviBarra')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EditForm({ abb, onSave, onDelete, onCancel, busy, isNew = false }) {
  const t = useTranslations('abbonamentiManager')
  const oggi = new Date()
  const tra1anno = new Date(oggi.setFullYear(oggi.getFullYear() + 1)).toISOString().slice(0, 10)

  const [form, setForm] = useState({
    piano: abb.piano ?? 'mensile',
    stato: abb.stato ?? 'attivo',
    scadenza: isoDate(abb.scadenza) || (abb.piano !== 'lifetime' ? tra1anno : ''),
    nota: abb.nota ?? '',
  })

  function upd(k) { return (e) => setForm(s => ({ ...s, [k]: e.target.value })) }

  return (
    <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--carta)',
      borderRadius: 8, border: '1px solid var(--linea)' }}>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>{t('piano')}</label>
          <select value={form.piano} onChange={upd('piano')}>
            <option value="mensile">{t('pianoMensile')}</option>
            <option value="annuale">{t('pianoAnnuale')}</option>
            <option value="lifetime">{t('pianoLifetimeLungo')}</option>
            <option value="prova">{t('pianoProva')}</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>{t('stato')}</label>
          <select value={form.stato} onChange={upd('stato')}>
            <option value="attivo">{t('stato_attivo')}</option>
            <option value="disdetto">{t('stato_disdetto')}</option>
            <option value="scaduto">{t('stato_scaduto')}</option>
            <option value="cancellato">{t('stato_cancellato')}</option>
            <option value="prova">{t('stato_prova')}</option>
          </select>
        </div>
        {form.piano !== 'lifetime' && (
          <div className="field" style={{ margin: 0 }}>
            <label>{t('scadenza')}</label>
            <input type="date" value={form.scadenza} onChange={upd('scadenza')} />
          </div>
        )}
        <div className="field field-full" style={{ margin: 0 }}>
          <label>{t('notaLabel')}</label>
          <input type="text" value={form.nota} onChange={upd('nota')} placeholder={t('notaPlaceholder')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => onSave(form)} disabled={busy}>
          {busy ? t('salvataggio') : isNew ? t('creaBtn') : t('salvaBtn')}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel} disabled={busy}>
          {t('annulla')}
        </button>
        {!isNew && onDelete && (
          <button className="btn-ghost btn-del" type="button" onClick={onDelete} disabled={busy}
            style={{ marginLeft: 'auto' }}>
            {t('elimina')}
          </button>
        )}
      </div>
    </div>
  )
}
