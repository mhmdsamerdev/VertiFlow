import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, Wifi, WifiOff, Loader2, Clock, LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConnectionStatus } from '../../types/telemetry'
import { Sidebar } from './Sidebar'

interface Props {
  status: ConnectionStatus
  activeTab: string
  onTabChange: (label: string) => void
  children: React.ReactNode
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; dotClass: string; Icon: LucideIcon }
> = {
  connected:    { label: 'Live',         color: 'text-emerald-400', dotClass: 'bg-emerald-400 animate-pulse',       Icon: Wifi      },
  connecting:   { label: 'Connecting…',  color: 'text-amber-400',   dotClass: 'bg-amber-400 animate-pulse',         Icon: Loader2   },
  disconnected: { label: 'Reconnecting', color: 'text-rose-400',    dotClass: 'bg-rose-400',                        Icon: WifiOff   },
  error:        { label: 'Error',        color: 'text-rose-500',    dotClass: 'bg-rose-500 animate-pulse',          Icon: WifiOff   },
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs text-slate-500 flex items-center gap-1.5">
      <Clock size={11} />
      {time.toLocaleTimeString()}
    </span>
  )
}

export function DashboardLayout({ status, activeTab, onTabChange, children }: Props) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex min-h-screen bg-slate-950 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="relative flex flex-col flex-1 min-w-0">
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
          {/* Branding */}
          <div className="flex items-center gap-2.5">
            <Leaf size={16} className="text-emerald-400" />
            <span className="font-semibold text-sm text-white tracking-wide">VertiFlow</span>
            <span className="text-slate-600 text-xs font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              v0.1 · zone-alpha
            </span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-4">
            <LiveClock />

            {/* WebSocket status badge */}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
              {cfg.label}
            </div>
          </div>
        </header>

        {/* ── Loading / Error overlay ──────────────────────────────── */}
        <AnimatePresence>
          {(status === 'connecting' || status === 'disconnected' || status === 'error') && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card px-8 py-6 flex flex-col items-center gap-4 pointer-events-auto"
              >
                {status === 'connecting' ? (
                  <Loader2 size={32} className="text-emerald-400 animate-spin" />
                ) : (
                  <WifiOff size={32} className="text-rose-400" />
                )}
                <div className="text-center">
                  <p className="font-semibold text-white">
                    {status === 'connecting' ? 'Connecting to telemetry stream…' : 'Stream disconnected'}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    {status === 'connecting'
                      ? 'Awaiting first packet from ws://localhost:8000'
                      : 'Attempting to reconnect in 3 s…'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
