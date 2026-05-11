import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Loader2, ChevronDown } from 'lucide-react'
import { ConnectionStatus } from '../../types/telemetry'
import { useZoneContext } from '../../context/ZoneContext'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

interface Props {
  status: ConnectionStatus
  activeTab: string
  onTabChange: (label: string) => void
  onSettingsClick?: () => void
  children: React.ReactNode
}

// ─── System clock ─────────────────────────────────────────────────────────────
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

// ─── Connection badge ─────────────────────────────────────────────────────────
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

// ─── Breadcrumb zone picker ───────────────────────────────────────────────────
function ZoneBreadcrumb() {
  const { farms, activeFarm, activeZone, setActiveFarm, setActiveZone } = useZoneContext()
  const [farmOpen, setFarmOpen] = useState(false)
  const [zoneOpen, setZoneOpen] = useState(false)

  const farmRef = useRef<HTMLDivElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (farmRef.current && !farmRef.current.contains(e.target as Node)) setFarmOpen(false)
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setZoneOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div className="flex items-center gap-2 md:gap-2.5">
      <span className="text-sm font-semibold text-zinc-100 tracking-tight">VertiFlow</span>
      <span className="text-zinc-700 select-none hidden md:inline">/</span>

      {/* ── Farm picker ── */}
      <div className="relative" ref={farmRef}>
        <button
          onClick={() => { setFarmOpen(v => !v); setZoneOpen(false) }}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {activeFarm?.name ?? '—'}
          <ChevronDown size={11} className={`text-zinc-600 transition-transform ${farmOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {farmOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full mt-2 left-0 z-50 w-52 card shadow-xl shadow-black/60 p-1.5"
            >
              {farms.map(farm => (
                <button
                  key={farm.id}
                  onClick={() => { setActiveFarm(farm.id); setFarmOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    farm.id === activeFarm?.id
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xs font-medium">{farm.name}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{farm.location}</div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <span className="text-zinc-700 select-none hidden md:inline">/</span>

      {/* ── Zone picker ── */}
      <div className="relative" ref={zoneRef}>
        <button
          onClick={() => { setZoneOpen(v => !v); setFarmOpen(false) }}
          className="flex items-center gap-1 text-sm text-zinc-400 font-medium hover:text-zinc-200 transition-colors"
        >
          {activeZone?.name ?? '—'}
          <ChevronDown size={11} className={`text-zinc-500 transition-transform ${zoneOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {zoneOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full mt-2 left-0 z-50 w-60 card shadow-xl shadow-black/60 p-1.5"
            >
              {(activeFarm?.zones ?? []).map(zone => (
                <button
                  key={zone.id}
                  onClick={() => { setActiveZone(zone.id); setZoneOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    zone.id === activeZone?.id
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xs font-medium">{zone.name}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{zone.description} · {zone.cropName}</div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function DashboardLayout({ status, activeTab, onTabChange, onSettingsClick, children }: Props) {
  const { activeZone } = useZoneContext()

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} onSettingsClick={onSettingsClick} />

      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className="shrink-0 flex items-center justify-between px-4 md:px-5 h-12 border-b border-zinc-800 bg-zinc-950">
          <ZoneBreadcrumb />
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden sm:block">
              <SystemClock />
            </div>
            <ConnectionBadge status={status} />
          </div>
        </header>

        {/* ── Connecting / disconnected overlay ── */}
        <AnimatePresence>
          {activeZone && (status === 'disconnected' || status === 'error') && (
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
                <WifiOff size={28} className="text-red-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-100">
                    Stream disconnected
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    Retrying in 3 s — check backend status
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

        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />

      </div>
    </div>
  )
}
