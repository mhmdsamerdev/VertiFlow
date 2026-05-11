import React from 'react'
import {
  Activity,
  Box,
  LayoutDashboard,
  Settings,
  Thermometer,
  Zap,
} from 'lucide-react'

interface NavItem {
  icon: any
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Box,             label: 'Layout' },
  { icon: Thermometer,     label: 'Sensors' },
  { icon: Zap,             label: 'Controls' },
  { icon: Activity,        label: 'Analytics' },
  { icon: Settings,        label: 'Settings' },
]

interface BottomNavProps {
  activeTab: string
  onTabChange: (label: string) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="md:hidden flex items-center justify-around h-16 bg-zinc-950 border-t border-zinc-800 px-2 pb-safe">
      {NAV_ITEMS.map(({ icon: Icon, label }) => {
        const active = activeTab === label
        return (
          <button
            key={label}
            onClick={() => onTabChange(label)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              active ? 'text-green-500' : 'text-zinc-500'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
