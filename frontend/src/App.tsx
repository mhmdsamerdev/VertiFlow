import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
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


// ─── App inner (must be inside ZoneProvider) ────────────────────────────────
function AppContent() {
  const { status, data, history, recipeMatch, overallMatch, sensorHealth, sensorValidation } = useTelemetry()
  const { farms, loading, activeZone, setActiveZone, activeTab, setActiveTab } = useZoneContext()

  function handleViewDashboard(zoneId: string) {
    setActiveZone(zoneId)
    setActiveTab('Dashboard')
  }

  function handleSettingsClick() {
    setActiveTab('Settings')
  }

  // ── Show first-run or loading if no farms (but let Settings through) ──────
  if (loading || (farms.length === 0 && activeTab !== 'Settings')) {
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
