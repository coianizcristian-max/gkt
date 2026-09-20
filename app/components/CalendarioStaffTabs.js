'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import CalendarioMese from '@/app/components/CalendarioMese'
import CalendarioAgendaStaff from '@/app/components/CalendarioAgendaStaff'

// Calendario del preparatore. SOLO SU MOBILE: due schede, "Prossimi eventi"
// (lista, si apre per prima) e "Mese" (griglia). Su PC la barra delle schede
// non c'e' e si vede la griglia come prima (classi .cst-*, globals.css).
export default function CalendarioStaffTabs({ allenamenti, partite, categorie, oggiStr }) {
  const t = useTranslations('calendario')
  const [vista, setVista] = useState('agenda')
  return (
    <div className={`cst cst-${vista}`}>
      <div className="calview-tabs cst-tabs">
        <button type="button" className={vista === 'agenda' ? 'on' : ''} onClick={() => setVista('agenda')}>{t('tabProssimi')}</button>
        <button type="button" className={vista === 'mese' ? 'on' : ''} onClick={() => setVista('mese')}>{t('tabMese')}</button>
      </div>
      <div className="cst-pannello cst-p-agenda">
        <CalendarioAgendaStaff allenamenti={allenamenti} partite={partite} oggiStr={oggiStr} />
      </div>
      <div className="cst-pannello cst-p-mese">
        <CalendarioMese allenamenti={allenamenti} partite={partite} categorie={categorie} vista="staff" oggiIso={oggiStr} />
      </div>
    </div>
  )
}
