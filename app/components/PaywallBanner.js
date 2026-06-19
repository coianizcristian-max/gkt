'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Demo data per ogni funzionalità ─────────────────────────────────────────
const DEMO_DATA = {
  statistiche_dettaglio: {
    titolo: 'Statistiche dettaglio portiere',
    desc: 'Vedi l\'andamento completo di stagione: trend mensile, streak presenze, confronto categoria, analisi per caratteristica.',
    content: () => (
      <div>
        <div style={S.kpiGrid}>
          {[['34/38','Presenze'],['6.72','Media voto'],['89%','% presenze'],['6','Clean sheet']].map(([v,l],i) => (
            <div key={i} style={S.kpi}><div style={{...S.kpiVal, color: i===1?'#0a7ec2':i===2?'#1f8a4c':'#14202b'}}>{v}</div><div style={S.kpiLab}>{l}</div></div>
          ))}
        </div>
        <div style={S.section}>
          {[['📈 Trend mensile','+0.18 vs mese scorso','#1f8a4c'],['🔥 Serie attuale','12 consecutivi','#14202b'],['⭐ Voto migliore','7.75','#1f8a4c'],['👥 vs Categoria','+0.41 ▲ sopra','#1f8a4c']].map(([l,v,c],i)=>(
            <div key={i} style={S.row}><span style={{color:'#4a5b68'}}>{l}</span><b style={{color:c}}>{v}</b></div>
          ))}
        </div>
        <div style={S.section}>
          <div style={S.sLabel}>Andamento mensile</div>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',height:64}}>
            {[{l:'Ott',v:6.3},{l:'Nov',v:6.5},{l:'Dic',v:6.8},{l:'Gen',v:6.7},{l:'Feb',v:7.0},{l:'Mar',v:7.1}].map((m,i,a)=>(
              <div key={m.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0a7ec2'}}>{m.v}</div>
                <div style={{width:'100%',borderRadius:'3px 3px 0 0',background:i===a.length-1?'#0a7ec2':'#a8cce8',height:`${Math.round((m.v/10)*50)}px`,minHeight:3}}/>
                <div style={{fontSize:9,color:'#4a5b68'}}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.section}>
          <div style={S.sLabel}>Per caratteristica</div>
          {[['Uscite',7.1],['Tecnica',6.8],['Posizionamento',6.9],['Piedi',6.2]].map(([n,v])=>(
            <div key={n} style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{color:'#4a5b68'}}>{n}</span><b style={{color:v>=7?'#1f8a4c':'#0a7ec2'}}>{v}</b>
              </div>
              <div style={{height:6,background:'#e2e6e1',borderRadius:3}}>
                <div style={{width:`${(v/10)*100}%`,height:'100%',background:v>=7?'#1f8a4c':'#0a7ec2',borderRadius:3}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  obiettivi_portieri: {
    titolo: 'Obiettivi portieri',
    desc: 'Imposta obiettivi personalizzati per ogni portiere con stato di avanzamento, note e scadenze.',
    content: () => (
      <div>
        {[
          {t:'Migliorare le uscite alte',s:'In corso',c:'#0a7ec2',n:'Lavoriamo ogni martedì sulla tecnica di uscita. Progressi visibili.'},
          {t:'Gioco con i piedi',s:'Aperto',c:'#e8a72c',n:'Fondamentale per il gioco del mister. Da iniziare.'},
          {t:'Leadership difensiva',s:'Raggiunto',c:'#1f8a4c',n:'Ottimi progressi nella comunicazione con la difesa.'},
        ].map((o,i)=>(
          <div key={i} style={{border:'1px solid #e2e6e1',borderLeft:`4px solid ${o.c}`,borderRadius:8,padding:'12px 14px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <b style={{fontSize:14}}>{o.t}</b>
              <span style={{fontSize:11,fontWeight:700,color:o.c,background:`${o.c}22`,padding:'2px 8px',borderRadius:999}}>{o.s}</span>
            </div>
            <p style={{fontSize:12,color:'#4a5b68',margin:0}}>{o.n}</p>
          </div>
        ))}
      </div>
    ),
  },

  inviti_creazione: {
    titolo: 'Creazione link di invito',
    desc: 'Crea link personalizzati per ogni portiere. Chi lo apre si registra e viene collegato automaticamente al suo profilo.',
    content: () => (
      <div>
        <div style={{background:'#f6f7f4',borderRadius:8,padding:14,marginBottom:12}}>
          <div style={{fontSize:12,color:'#4a5b68',marginBottom:8}}>Esempio link invito</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{flex:1,background:'#fff',border:'1px solid #e2e6e1',borderRadius:6,padding:'8px 10px',fontSize:11,fontFamily:'monospace',color:'#4a5b68',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              gkt2026.vercel.app/registrati?invito=a1b2c3d4...
            </div>
            <div style={{padding:'8px 12px',background:'#0a7ec2',color:'#fff',borderRadius:6,fontSize:12,fontWeight:700,flexShrink:0}}>Copia</div>
          </div>
        </div>
        {[{n:'Marco Pozza',s:'✅ usato',c:'#1f8a4c'},{n:'Jacopo Barban',s:'🟢 attivo',c:'#0a7ec2'},{n:'Mirko De Antoni',s:'🟢 attivo',c:'#0a7ec2'}].map((p,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',border:'1px solid #e2e6e1',borderRadius:8,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#0a7ec2',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{p.n[0]}</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{p.n}</div><div style={{fontSize:11,color:p.c}}>{p.s}</div></div>
            <div style={{fontSize:11,color:'#4a5b68',padding:'4px 8px',border:'1px solid #e2e6e1',borderRadius:4}}>📋 Link</div>
          </div>
        ))}
      </div>
    ),
  },

  ricorrenze_genera: {
    titolo: 'Generazione automatica allenamenti',
    desc: 'Imposta i giorni fissi di allenamento e genera automaticamente tutto il calendario stagionale in un click.',
    content: () => (
      <div>
        {[{cat:'Prima Squadra',g:'Martedì + Giovedì',ora:'18:30'},{cat:'Allievi',g:'Mercoledì',ora:'17:00'}].map((r,i)=>(
          <div key={i} style={{border:'1px solid #e2e6e1',borderRadius:8,padding:'12px 14px',marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{r.cat}</div>
            <div style={{display:'flex',gap:16,fontSize:13,color:'#4a5b68'}}>
              <span>📅 {r.g}</span><span>🕐 {r.ora}</span>
            </div>
          </div>
        ))}
        <div style={{background:'#e8f4ff',border:'1px solid #b8d9f5',borderRadius:8,padding:'12px 14px',marginTop:4}}>
          <div style={{fontWeight:700,fontSize:14,color:'#0a7ec2',marginBottom:4}}>🚀 Genera allenamenti</div>
          <p style={{fontSize:12,color:'#4a5b68',margin:0}}>Creerebbe automaticamente <b>87 allenamenti</b> dal 1 set 2025 al 30 mag 2026. Le date già esistenti non vengono duplicate.</p>
        </div>
      </div>
    ),
  },

  feedback_allenatore: {
    titolo: 'Feedback portieri',
    desc: 'Leggi cosa pensano i tuoi portieri di ogni allenamento: voto seduta, commento e note private.',
    content: () => (
      <div>
        {[
          {n:'Marco P.',v:7,t:'Ottima seduta sui cross, mi sono sentito molto più sicuro nelle uscite alte.'},
          {n:'Jacopo B.',v:6,t:'Buon allenamento, ma ho ancora difficoltà con i tiri dal limite. Da rivedere.'},
          {n:'Mirko D.',v:7,t:'Finalmente riusciamo a lavorare sulla comunicazione con la difesa. Molto utile.'},
        ].map((f,i)=>(
          <div key={i} style={{borderBottom:'1px solid #e2e6e1',paddingBottom:12,marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <b style={{fontSize:14}}>{f.n}</b>
              <span style={{fontSize:12,color:'#4a5b68'}}>voto seduta: <b style={{color:'#0a7ec2'}}>{f.v}</b></span>
            </div>
            <p style={{fontSize:13,color:'#14202b',margin:0,fontStyle:'italic'}}>"{f.t}"</p>
          </div>
        ))}
      </div>
    ),
  },

  valutazioni_partita: {
    titolo: 'Valutazioni partita',
    desc: 'Inserisci voto, punti e note per ogni portiere dopo ogni partita. Statistiche separate campionato/amichevoli.',
    content: () => (
      <div>
        <div style={{background:'#f6f7f4',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13}}>
          <b>Azzurra Sandrigo vs Vicenza</b> · Campionato · Casa · <b style={{color:'#1f8a4c'}}>2–1 ✓</b>
        </div>
        {[{n:'Marco Pozza',pr:true,v:7.5,p:'A',cs:true},{n:'Jacopo Barban',pr:false,v:null,p:'-',cs:false}].map((p,i)=>(
          <div key={i} style={{border:'1px solid #e2e6e1',borderRadius:8,padding:'12px 14px',marginBottom:10,opacity:p.pr?1:0.5}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.pr?10:0}}>
              <span style={{fontSize:12,background:p.pr?'#1f8a4c22':'#e2e6e1',color:p.pr?'#1f8a4c':'#4a5b68',padding:'2px 8px',borderRadius:4,fontWeight:600}}>{p.pr?'Titolare':'Panchina'}</span>
              <b style={{flex:1}}>{p.n}</b>
              {p.cs && <span style={{fontSize:11,background:'#1f8a4c22',color:'#1f8a4c',padding:'2px 8px',borderRadius:999,fontWeight:700}}>Clean sheet</span>}
            </div>
            {p.pr && <div style={{display:'flex',gap:16,fontSize:13}}>
              <span>Voto: <b style={{color:'#0a7ec2'}}>{p.v}</b></span>
              <span>Punti: <b>{p.p}</b></span>
            </div>}
          </div>
        ))}
      </div>
    ),
  },

  profilo_ricerca: {
    titolo: 'Profilo nella ricerca pubblica',
    desc: 'Il tuo profilo appare nella ricerca pubblica di GKT. I club possono trovarti e contattarti.',
    content: () => (
      <div>
        <div style={{border:'1px solid #e2e6e1',borderRadius:8,padding:16,marginBottom:12}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'#0a7ec2',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:20,flexShrink:0}}>A</div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>Mario Allenatore</div>
              <div style={{fontSize:13,color:'#4a5b68'}}>📍 Padova · 15 km</div>
              <div style={{fontSize:12,color:'#1f8a4c',marginTop:2}}>✓ Disponibile</div>
            </div>
          </div>
          <p style={{fontSize:13,color:'#4a5b68',margin:'0 0 10px'}}>Preparatore portieri con 8 anni di esperienza nelle giovanili. Patentato UEFA B.</p>
          <div style={{fontSize:12,color:'#4a5b68'}}>🎓 Licenza UEFA B · Corso portieri FIGC · Master Goalkeeping</div>
        </div>
        <div style={{background:'#e8f4ff',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#0a7ec2'}}>
          👁 Visto da <b>23 club</b> nell'ultimo mese
        </div>
      </div>
    ),
  },

  valutazioni_allenamento: {
    titolo: 'Valutazioni allenamento',
    desc: 'Inserisci presenze, voti e punteggi per parametro per ogni portiere dopo ogni seduta.',
    content: () => (
      <div>
        {[{n:'Marco Pozza',pr:true,v:6.75,par:[{n:'Uscite',v:7},{n:'Tecnica',v:6.5},{n:'Piedi',v:6.75}]},{n:'Jacopo Barban',pr:true,v:6.5,par:[{n:'Uscite',v:6.5},{n:'Tecnica',v:7},{n:'Piedi',v:6}]},{n:'Mirko De Antoni',pr:false,v:null,par:[]}].map((p,i)=>(
          <div key={i} style={{border:'1px solid #e2e6e1',borderRadius:8,padding:'12px 14px',marginBottom:10,opacity:p.pr?1:0.55}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:p.pr&&p.par.length?10:0}}>
              <input type="checkbox" checked={p.pr} readOnly style={{accentColor:'#0a7ec2'}}/>
              <b style={{flex:1,fontSize:14}}>{p.n}</b>
              {p.pr && <span style={{fontSize:13,color:'#4a5b68'}}>Voto: <b style={{color:'#0a7ec2'}}>{p.v}</b></span>}
            </div>
            {p.pr && p.par.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {p.par.map((pp)=>(
                  <div key={pp.n} style={{display:'flex',justifyContent:'space-between',fontSize:12,background:'#f6f7f4',padding:'4px 8px',borderRadius:4}}>
                    <span style={{color:'#4a5b68'}}>{pp.n}</span><b>{pp.v}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    ),
  },

  esercizi_allenamento: {
    titolo: 'Esercizi negli allenamenti',
    desc: 'Collega esercizi dalla tua libreria a ogni seduta. Il portiere vede la scheda con immagine e descrizione.',
    content: () => (
      <div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          {[{t:'Uscite basse',tip:'Tecnica'},  {t:'Tiri dal limite',tip:'Reattività'},{t:'Gioco con i piedi',tip:'Tecnica'},{t:'Comunicazione',tip:'Tattica'}].map((e,i)=>(
            <div key={i} style={{border:`2px solid ${i<2?'#0a7ec2':'#e2e6e1'}`,borderRadius:8,padding:10,background:i<2?'rgba(10,126,194,0.06)':'#fff'}}>
              <div style={{fontWeight:600,fontSize:12}}>{e.t}</div>
              <div style={{fontSize:10,color:'#0a7ec2',marginTop:2}}>{e.tip}</div>
              {i<2 && <div style={{position:'relative',marginTop:4}}><span style={{fontSize:10,color:'#0a7ec2',fontWeight:700}}>✓ Selezionato</span></div>}
            </div>
          ))}
        </div>
        <div style={{background:'#f6f7f4',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#4a5b68'}}>
          Il portiere vede la scheda esercizio con foto e descrizione dettagliata direttamente dalla sua app.
        </div>
      </div>
    ),
  },
}

const S = {
  kpiGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12},
  kpi:{background:'#f6f7f4',borderRadius:8,padding:'10px 6px',textAlign:'center'},
  kpiVal:{fontSize:18,fontWeight:800,lineHeight:1},
  kpiLab:{fontSize:10,color:'#4a5b68',marginTop:4},
  section:{borderTop:'1px solid #e2e6e1',paddingTop:10,marginTop:4,paddingBottom:6},
  row:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'3px 0',fontSize:13},
  sLabel:{fontSize:11,fontWeight:700,color:'#4a5b68',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8},
}

function DemoModal({ chiave, onClose }) {
  const demo = DEMO_DATA[chiave]
  if (!demo) return null
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" style={{maxWidth:480,maxHeight:'88vh'}} onClick={(e)=>e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} type="button">✕</button>
        <div style={{display:'inline-block',padding:'3px 10px',borderRadius:999,background:'rgba(10,126,194,0.12)',color:'#0a7ec2',fontSize:12,fontWeight:700,marginBottom:8}}>
          📋 Anteprima funzionalità
        </div>
        <h2 style={{margin:'0 0 6px',fontSize:18}}>{demo.titolo}</h2>
        <p style={{fontSize:13,color:'#4a5b68',margin:'0 0 14px',lineHeight:1.5}}>{demo.desc}</p>
        <div style={{borderTop:'1px solid #e2e6e1',paddingTop:14,marginBottom:14}}>
          {demo.content()}
        </div>
        <div style={{borderTop:'1px solid #e2e6e1',paddingTop:14,textAlign:'center'}}>
          <p style={{fontSize:13,color:'#4a5b68',margin:'0 0 10px'}}>Questi sono dati di esempio. Con l&apos;abbonamento vedrai i tuoi dati reali.</p>
          <Link href="/abbonati" className="btn" style={{display:'block',width:'100%',textAlign:'center'}}>
            🔓 Abbonati per sbloccare
          </Link>
          <p style={{fontSize:11,color:'#4a5b68',marginTop:8}}>Disdici in qualsiasi momento · Stripe</p>
        </div>
      </div>
    </div>
  )
}

export default function PaywallBanner({ chiave, label, wrap = false, children }) {
  const [demoOpen, setDemoOpen] = useState(false)
  const hasDemo = chiave && DEMO_DATA[chiave]

  const banner = (
    <div className="paywall-banner">
      {demoOpen && <DemoModal chiave={chiave} onClose={() => setDemoOpen(false)} />}
      <div className="paywall-icon">🔒</div>
      <div className="paywall-text">
        <b>{label ?? 'Funzionalità a pagamento'}</b>
        <p>Abbonati per sbloccare questa sezione.</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
        {hasDemo && (
          <button type="button" onClick={() => setDemoOpen(true)}
            style={{padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer',border:'1px solid var(--azzurro)',borderRadius:'var(--r-sm)',background:'transparent',color:'var(--azzurro)',whiteSpace:'nowrap'}}>
            👁 Vedi anteprima
          </button>
        )}
        <Link href="/abbonati" className="btn paywall-cta">Abbonati</Link>
      </div>
    </div>
  )

  if (!wrap) return banner
  return (
    <div className="paywall-wrap">
      <div className="paywall-overlay" aria-hidden="true">{banner}</div>
      <div className="paywall-content" inert="true">{children}</div>
    </div>
  )
}
