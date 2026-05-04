import React from 'react'
import { motion } from 'framer-motion'
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
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard'  },
  { icon: Leaf,            label: 'Zones'       },
  { icon: Thermometer,     label: 'Sensors'     },
  { icon: Zap,             label: 'Controls'    },
  { icon: Activity,        label: 'Analytics'   },
  { icon: Brain,           label: 'AI Insights' },
  { icon: BarChart3,       label: 'Reports'     },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (label: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex flex-col items-center w-16 min-h-screen bg-slate-950 border-r border-white/[0.06] py-5 gap-2 shrink-0">
      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-4 flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 animate-glow-emerald"
      >
        <Leaf size={18} className="text-emerald-400" />
      </motion.div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 w-full px-2">
        {NAV_ITEMS.map(({ icon: Icon, label }, i) => {
          const active = activeTab === label
          return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 + 0.15, duration: 0.3 }}
          >
            <button
              title={label}
              onClick={() => onTabChange(label)}
              className={`
                group relative flex items-center justify-center w-full h-10 rounded-lg
                transition-all duration-200
                ${active
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                }
              `}
            >
              <Icon size={18} />

              {/* Active pip */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />
              )}

              {/* Tooltip */}
              <span
                className="
                  pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md
                  bg-slate-800 border border-white/[0.08] text-slate-200 text-xs whitespace-nowrap
                  opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
                  transition-all duration-150 z-50
                "
              >
                {label}
              </span>
            </button>
          </motion.div>
          )
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="mt-auto">
        <button
          title="Settings"
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-all duration-200"
        >
          <Settings size={18} />
          <span
            className="
              pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md
              bg-slate-800 border border-white/[0.08] text-slate-200 text-xs whitespace-nowrap
              opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
              transition-all duration-150 z-50
            "
          >
            Settings
          </span>
        </button>
      </div>
    </aside>
  )
}
