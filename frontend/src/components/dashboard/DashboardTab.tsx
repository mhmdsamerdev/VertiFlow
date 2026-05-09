import React from 'react'
import { FarmHealthStatus } from './FarmHealthStatus'
import { ActionItems } from './ActionItems'
import { ZoneSnapshots } from './ZoneSnapshots'
import { AutomationStatus } from './AutomationStatus'
import { useDashboardLogic } from '../../hooks/useDashboardLogic'

export function DashboardTab() {
  const { farmHealthScore, zoneHealths, actionItems, overallStatus } = useDashboardLogic()

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-6 space-y-8">
        <FarmHealthStatus 
          score={farmHealthScore} 
          status={overallStatus} 
          zoneHealths={zoneHealths} 
          actionItemsCount={actionItems.length}
        />
        
        <ActionItems items={actionItems} />
        
        <ZoneSnapshots zoneHealths={zoneHealths} />
        
        <AutomationStatus />
      </div>
    </div>
  )
}
