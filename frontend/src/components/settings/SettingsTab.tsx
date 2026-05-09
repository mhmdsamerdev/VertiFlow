import React, { useState } from 'react'
import {
  Building2,
  Cpu,
  Workflow,
  Bell,
  FileText,
  Settings,
  LucideIcon,
} from 'lucide-react'
import { SettingsSection } from './types'
import { FarmInfoSection } from './FarmInfoSection'
import { DevicesSensorsSection } from './DevicesSensorsSection'
import { AutomationRulesSection } from './AutomationRulesSection'
import { AlertsSection } from './AlertsSection'
import { ReportsSection } from './ReportsSection'

interface NavItem {
  id: SettingsSection
  label: string
  icon: LucideIcon
  description: string
}

const SETTINGS_NAV: NavItem[] = [
  { id: 'farm-info', label: 'Farm Info', icon: Building2, description: 'Farm and zone configuration' },
  { id: 'devices-sensors', label: 'Devices & Sensors', icon: Cpu, description: 'Manage devices and thresholds' },
  { id: 'automation-rules', label: 'Automation Rules', icon: Workflow, description: 'IF-THEN automation logic' },
  { id: 'alerts', label: 'Alerts', icon: Bell, description: 'Notifications and thresholds' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'Automated reporting' },
]

export function SettingsTab() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('farm-info')

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex">
      {/* ─── Settings Navigation ─── */}
      <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-200">Settings</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {SETTINGS_NAV.map(({ id, label, icon: Icon, description }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  active
                    ? 'bg-green-500/10 border-l-2 border-green-500'
                    : 'border-l-2 border-transparent hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={active ? 'text-green-400' : 'text-zinc-500'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                      {description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600">
            VertiFlow Configuration
          </p>
          <p className="text-[10px] text-zinc-700 mt-0.5">
            Changes auto-saved
          </p>
        </div>
      </aside>

      {/* ─── Settings Content ─── */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-zinc-950">
        {activeSection === 'farm-info' && <FarmInfoSection />}
        {activeSection === 'devices-sensors' && <DevicesSensorsSection />}
        {activeSection === 'automation-rules' && <AutomationRulesSection />}
        {activeSection === 'alerts' && <AlertsSection />}
        {activeSection === 'reports' && <ReportsSection />}
      </main>
    </div>
  )
}
