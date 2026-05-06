import React from 'react'
import {
  Activity,
  BarChart3,
  Brain,
  Leaf,
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
  { icon: Leaf,            label: 'Zones',       code: 'ZNE' },
  { icon: Thermometer,     label: 'Sensors',     code: 'SEN' },
  { icon: Zap,             label: 'Controls',    code: 'CTL' },
  { icon: Activity,        label: 'Analytics',   code: 'ANL' },
  { icon: Brain,           label: 'AI Insights', code: 'AIS' },
  { icon: BarChart3,       label: 'Reports',     code: 'RPT' },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (label: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex flex-col w-12 h-screen bg-slate-950 border-r border-slate-800 shrink-0">

      {/* System mark — aligns with header row 1 (h-8) */}
      <div className="flex items-center justify-center h-8 border-b border-slate-800 shrink-0">
        <span className="font-mono text-[11px] font-bold text-emerald-500 tracking-widest">VF</span>
      </div>

      {/* Spacer — aligns with header row 2 (h-6) */}
      <div className="h-6 border-b border-slate-800 shrink-0" />

      {/* Nav items */}
      <nav className="flex flex-col flex-1 py-1">
        {NAV_ITEMS.map(({ icon: Icon, label, code }) => {
          const active = activeTab === label
          return (
            <button
              key={label}
              title={label}
              onClick={() => onTabChange(label)}
              className={`
                group relative flex flex-col items-center justify-center w-full h-10
                transition-colors duration-100
                ${active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800/50'
                }
              `}
            >
              {/* Active bar — full height left edge */}
              {active && (
                <span className="absolute left-0 inset-y-0 w-[2px] bg-emerald-500" />
              )}

              <Icon size={13} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[7px] font-mono tracking-widest mt-0.5 opacity-50">{code}</span>

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-1 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50 uppercase tracking-wider">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Bottom: config + node ID */}
      <div className="border-t border-slate-800 shrink-0">
        <button
          title="Settings"
          className="group relative flex flex-col items-center justify-center w-full h-10 text-slate-700 hover:text-slate-400 hover:bg-slate-800/50 transition-colors duration-100"
        >
          <Settings size={13} strokeWidth={1.5} />
          <span className="text-[7px] font-mono tracking-widest mt-0.5 opacity-50">CFG</span>
          <span className="pointer-events-none absolute left-full ml-1 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-50 uppercase tracking-wider">
            Settings
          </span>
        </button>
        <div className="flex items-center justify-center h-5 border-t border-slate-800">
          <span className="text-[7px] font-mono text-slate-800 tracking-widest">N-01</span>
        </div>
      </div>

    </aside>
  )
}
