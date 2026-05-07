import React from 'react'
import {
  Activity,
  BarChart3,
  Box,
  LayoutDashboard,
  LucideIcon,
  Settings,
  Thermometer,
  Zap,
} from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  code: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',  code: 'DSH' },
  { icon: Box,             label: 'Layout',      code: 'LYT' },
  { icon: Thermometer,     label: 'Sensors',     code: 'SEN' },
  { icon: Zap,             label: 'Controls',    code: 'CTL' },
  { icon: Activity,        label: 'Analytics',   code: 'ANL' },
  { icon: BarChart3,       label: 'Reports',     code: 'RPT' },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (label: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex flex-col w-14 h-screen bg-zinc-950 border-r border-zinc-800 shrink-0">

      {/* Logo mark — height matches header h-12 */}
      <div className="flex items-center justify-center h-12 border-b border-zinc-800 shrink-0">
        <span className="font-mono text-xs font-bold text-green-500 tracking-widest">VF</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col flex-1 py-2 gap-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, code }) => {
          const active = activeTab === label
          return (
            <button
              key={label}
              title={label}
              onClick={() => onTabChange(label)}
              className={`
                group relative flex flex-col items-center justify-center w-full h-11
                transition-colors duration-100
                ${active
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 inset-y-0 w-0.5 bg-green-500 rounded-r" />
              )}
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[8px] font-mono tracking-widest mt-0.5 opacity-40">{code}</span>
              <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50 shadow-lg">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-zinc-800 shrink-0 pb-2 pt-0.5">
        <button
          title="Settings"
          className="group relative flex flex-col items-center justify-center w-full h-11 text-zinc-700 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors duration-100"
        >
          <Settings size={15} strokeWidth={1.5} />
          <span className="text-[8px] font-mono tracking-widest mt-0.5 opacity-40">CFG</span>
          <span className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50 shadow-lg">
            Settings
          </span>
        </button>
      </div>

    </aside>
  )
}
