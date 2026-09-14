'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import CalendarioMese from '@/app/components/CalendarioMese'
import CalendarioAgenda from '@/app/components/CalendarioAgenda'

export default function CalendarioPortiereTabs({ allenamenti, partite, categorie, oggiStr }) {
  const t = useTranslations('calendario')
  const [vista, setVista] = useState('agenda')

  return (
    <div>
      <div className="calview-tabs">
        <button type="button" className={vista === 'agenda' ? 'on' : ''} onClick={() => setVista('agenda')}>{t('tabAgenda')}</button>
        <button type="button" className={vista === 'mese' ? 'on' : ''} onClick={() => setVista('mese')}>{t('tabMese')}</button>
      </div>
      {vista === 'agenda'
        ? <CalendarioAgenda allenamenti={allenamenti} partite={partite} oggiStr={oggiStr} />
        : <CalendarioMese allenamenti={allenamenti} partite={partite} categorie={categorie} vista="portiere" />}
    </div>
  )
}
