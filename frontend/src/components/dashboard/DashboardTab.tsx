import React from 'react'
import { FarmHealthStatus } from './FarmHealthStatus'
import { ActionItems } from './ActionItems'
import { ZoneSnapshots } from './ZoneSnapshots'
import { AutomationStatus } from './AutomationStatus'
import { useDashboardLogic } from '../../hooks/useDashboardLogic'
import { useZoneContext } from '../../context/ZoneContext'
import { ruleApi, ApiRule } from '../../api/config'

export function DashboardTab() {
  const { 
    farmHealthScore, 
    zoneHealths, 
    actionItems, 
    minDaysToHarvest, 
    harvestLayer, 
    overallStatus, 
    trending,
    automationLogs 
  } = useDashboardLogic()

  const { activeZone } = useZoneContext()
  const [rules, setRules] = React.useState<ApiRule[]>([])

  React.useEffect(() => {
    if (!activeZone) return
    ruleApi.list(activeZone.id).then(setRules)
  }, [activeZone?.id])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-6 space-y-8">
        <FarmHealthStatus 
          score={farmHealthScore} 
          status={overallStatus} 
          trending={trending}
          minDaysToHarvest={minDaysToHarvest}
          harvestLayer={harvestLayer}
          zoneHealths={zoneHealths} 
          actionItemsCount={actionItems.length}
        />
        
        <ActionItems items={actionItems} />
        
        <ZoneSnapshots zoneHealths={zoneHealths} />
        
        <AutomationStatus logs={automationLogs} rules={rules} />
      </div>
    </div>
  )
}
