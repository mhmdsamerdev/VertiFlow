import React from 'react'
import { FarmHealthStatus } from './FarmHealthStatus'
import { ActionItems } from './ActionItems'
import { ZoneSnapshots } from './ZoneSnapshots'
import { AutomationStatus } from './AutomationStatus'
import { useDashboardLogic } from '../../hooks/useDashboardLogic'
import { useZoneContext } from '../../context/ZoneContext'
import { useTelemetry } from '../../hooks/useTelemetry'
import { ruleApi, ApiRule } from '../../api/config'
import { Beaker, AlertCircle } from 'lucide-react'

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
  const { isDemo } = useTelemetry()
  const [rules, setRules] = React.useState<ApiRule[]>([])

  React.useEffect(() => {
    if (!activeZone) return
    ruleApi.list(activeZone.id).then(setRules)
  }, [activeZone?.id])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b] overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8">
        {isDemo && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Beaker size={20} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-200">System in Demo Mode</h3>
                <p className="text-xs text-amber-500/60">Using simulated mock data. Change this in Settings to connect real hardware.</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Simulation Active</span>
            </div>
          </div>
        )}

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
