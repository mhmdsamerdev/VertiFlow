import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Loader2 } from 'lucide-react'
import { ConnectionStatus } from '../../types/telemetry'
import { Sidebar } from './Sidebar'

interface Props {
  status: ConnectionStatus
  activeTab: string
  onTabChange: (label: string) => void
  children: React.ReactNode
}

function SystemClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs text-zinc-500 tabular-nums tracking-wider">
      {time.toTimeString().slice(0, 8)}
    </span>
  )
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      <span className="text-xs font-medium text-green-500">Live</span>
    </div>
  )
  if (status === 'connecting') return (
    <div className="flex items-center gap-1.5">
      <Loader2 size={12} className="text-amber-400 animate-spin" />
      <span className="text-xs font-medium text-amber-400">Connecting…</span>
    </div>
  )
  return (
    <div className="flex items-center gap-1.5">
      <WifiOff size={12} className="text-red-500" />
      <span className="text-xs font-medium text-red-500">Disconnected</span>
    </div>
  )
}

export function DashboardLayout({ status, activeTab, onTabChange, children }: Props) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className="shrink-0 flex items-center justify-between px-5 h-12 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">VertiFlow</span>
            <span className="text-zinc-700 select-none">/</span>
            <span className="text-sm text-zinc-500">Farm 001</span>
            <span className="text-zinc-700 select-none">/</span>
            <span className="text-sm text-zinc-400 font-medium">Zone Alpha</span>
          </div>
          <div className="flex items-center gap-5">
            <SystemClock />
            <ConnectionBadge status={status} />
          </div>
        </header>

        {/* ── Connecting / disconnected overlay ── */}
        <AnimatePresence>
          {(status === 'connecting' || status === 'disconnected' || status === 'error') && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="card px-8 py-6 flex flex-col items-center gap-4 shadow-2xl shadow-black/50"
              >
                {status === 'connecting'
                  ? <Loader2 size={28} className="text-amber-400 animate-spin" />
                  : <WifiOff size={28} className="text-red-400" />
                }
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-100">
                    {status === 'connecting' ? 'Connecting to telemetry stream' : 'Stream disconnected'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {status === 'connecting'
                      ? 'ws://localhost:8000/ws/telemetry'
                      : 'Retrying in 3 s — check backend status'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content ── */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>

      </div>
    </div>
  )
}
