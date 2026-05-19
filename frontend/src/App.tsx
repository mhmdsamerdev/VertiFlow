import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Leaf } from 'lucide-react'
import { ZoneProvider, useZoneContext } from './context/ZoneContext'
import { SettingsProvider } from './context/SettingsContext'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ControlsTab } from './components/controls/ControlsTab'
import { useTelemetry } from './hooks/useTelemetry'
import { SensorReadings, SensorHealthMap, SensorHealthEntry, SensorValidation, ValidationResult } from './types/telemetry'
import { SensorsPanel } from './components/sensors/SensorsPanel'
import { LayoutTab } from './components/layout/LayoutTab'
import { AnalyticsTab } from './components/analytics/AnalyticsTab'
import { SettingsTab } from './components/settings/SettingsTab'
import { FirstRunScreen } from './components/layout/FirstRunScreen'
import { DashboardTab } from './components/dashboard/DashboardTab'
import { useAuth } from './context/AuthContext'
import { LoginScreen } from './components/layout/LoginScreen'


// ─── App inner (must be inside ZoneProvider) ────────────────────────────────
function AppContent() {
  const { isAuthenticated, isNewUser, loading: authLoading } = useAuth()
  const { status, data, history, recipeMatch, overallMatch, sensorHealth, sensorValidation } = useTelemetry()
  const { farms, loading, activeZone, setActiveZone, activeTab, setActiveTab } = useZoneContext()

  function handleViewDashboard(zoneId: string) {
    setActiveZone(zoneId)
    setActiveTab('Dashboard')
  }

  function handleSettingsClick() {
    setActiveTab('Settings')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-green-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf size={16} className="text-green-500 animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 tracking-wider font-mono animate-pulse">VERIFYING SESSION...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // ── Show first-run or loading if no farms (but let Settings through) ──────
  if (loading || (isNewUser && farms.length === 0 && activeTab !== 'Settings')) {
    return (
      <DashboardLayout status={status} activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={handleSettingsClick}>
        <FirstRunScreen onGoToSettings={() => setActiveTab('Settings')} />
      </DashboardLayout>
    )
  }

  const isDisconnected = !data?.is_demo && (!sensorHealth || Object.values(sensorHealth).every(h => !h.online))

  return (
    <DashboardLayout status={status} activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={handleSettingsClick}>
      {activeTab === 'Dashboard'
        ? <DashboardTab />
        : activeTab === 'Sensors'
        ? <SensorsPanel />
        : activeTab === 'Layout'
        ? <LayoutTab onViewDashboard={handleViewDashboard} />
        : activeTab === 'Controls'
        ? <ControlsTab 
            actuators={data?.actuators ?? null} 
            readings={data?.readings ?? null} 
            isDemo={data?.is_demo}
            isDisconnected={isDisconnected}
          />
        : activeTab === 'Analytics'
        ? <AnalyticsTab />
        : activeTab === 'Settings'
        ? <SettingsTab />
        : null
      }
    </DashboardLayout>
  )
}

import { AuthProvider } from './context/AuthContext'

// ─── App root ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ZoneProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ZoneProvider>
    </AuthProvider>
  )
}
