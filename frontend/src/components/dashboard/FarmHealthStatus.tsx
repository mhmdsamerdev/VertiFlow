import React from 'react'
import { AlertTriangle, CheckCircle2, XCircle, TrendingDown, TrendingUp } from 'lucide-react'
import { ZoneHealth } from '../../hooks/useDashboardLogic'

interface Props {
  score: number
  status: string
  trending: 'stable' | 'declining' | 'critical'
  minDaysToHarvest: number | null
  harvestLayer: ZoneHealth | null
  zoneHealths: ZoneHealth[]
  actionItemsCount: number
}

export function FarmHealthStatus({ score, status, trending, minDaysToHarvest, harvestLayer, zoneHealths, actionItemsCount }: Props) {
  const isHealthy = score > 85
  const isCritical = score <= 60

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            isHealthy ? 'bg-green-500/10' : isCritical ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            {isHealthy ? (
              <CheckCircle2 size={20} className="text-green-500" />
            ) : isCritical ? (
              <XCircle size={20} className="text-red-500" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500" />
            )}
          </div>
          <div>
            <h2 className={`text-lg font-bold tracking-tight ${
              isHealthy ? 'text-green-400' : isCritical ? 'text-red-400' : 'text-amber-400'
            }`}>
              FARM HEALTH: {score}/100 — {status}
            </h2>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Overall Status */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Overall Status</p>
          <div className="space-y-2">
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-1000 ${
                  isHealthy ? 'bg-green-500' : isCritical ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-zinc-100">{score}%</span>
              <div className="flex items-center gap-1 text-zinc-500 text-xs">
                {trending === 'stable' ? (
                  <>
                    <TrendingUp size={14} className="text-green-500" />
                    <span>Trend: Stable ↑</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} className="text-red-500" />
                    <span>Trend: Declining ↓</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per-Layer Status */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Per-Layer Status</p>
          <div className="space-y-2">
            {zoneHealths.map((zh, i) => (
              <div key={zh.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600">├─</span>
                  <span className="text-zinc-300">Layer {i+1} ({zh.cropName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400">{zh.score}/100</span>
                  {zh.status === 'healthy' ? (
                    <span className="text-green-500">✓</span>
                  ) : zh.status === 'critical' ? (
                    <span className="text-red-500">⚠️</span>
                  ) : (
                    <span className="text-amber-500">△</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Quick Stats</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">├─</span>
              <span className="text-zinc-400">Active Alerts:</span>
              <span className={actionItemsCount > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                {actionItemsCount} {actionItemsCount > 0 ? '🔴' : '✓'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">├─</span>
              <span className="text-zinc-400">Pending Actions:</span>
              <span className="text-amber-500 font-bold">{actionItemsCount} ⚡</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">└─</span>
              <span className="text-zinc-400">Days to Harvest:</span>
              <span className="text-blue-400 font-bold">
                {minDaysToHarvest !== null ? `${minDaysToHarvest} (${harvestLayer?.cropName || harvestLayer?.name || 'Layer 3'})` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
