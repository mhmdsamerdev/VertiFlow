import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConnectionStatus } from '../../types/telemetry'
import { Sidebar } from './Sidebar'

interface Props {
  status: ConnectionStatus
  activeTab: string
  onTabChange: (label: string) => void
  children: React.ReactNode
}

const STATUS_CFG: Record<ConnectionStatus, { label: string; cls: string }> = {
  connected:    { label: 'LIVE',         cls: 'bg-emerald-500 text-slate-950' },
  connecting:   { label: 'SYNC',         cls: 'bg-amber-500  text-slate-950 animate-pulse' },
  disconnected: { label: 'RECONNECT',    cls: 'bg-rose-600   text-white      animate-pulse' },
  error:        { label: 'FAULT',        cls: 'bg-rose-700   text-white      animate-pulse' },
}

const TICKER_MSGS = [
  'pH DEVIATION +0.21 ABOVE TARGET — MONITOR NITROGEN DOSAGE',
  'EC LEVEL NOMINAL — 1.82 mS/cm — VEGETATIVE STAGE OPTIMAL',
  'WATER TEMP STABLE — 22.3°C — CHILLER SET-POINT NOMINAL',
  'DO₂ MARGINAL — VERIFY AIR-STONE PLACEMENT IN RESERVOIR',
  'HUMIDITY 64.2% RH — VPD IDEAL — NO FUNGAL PRESSURE',
  'LIGHT CYCLE ACTIVE — 487 µmol/m²s — PPFD IN RANGE',
  'NEXT NUTRIENT DOSE SCHEDULED — T-00:43:17',
]

function AlertTicker() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % TICKER_MSGS.length), 4_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
      <span className="shrink-0 status-badge border border-amber-500/50 text-amber-500">
        SYS
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          className="text-[10px] font-mono text-slate-500 tracking-wider truncate"
        >
          {TICKER_MSGS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function SystemClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])
  const d    = time
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const t    = d.toTimeString().slice(0, 8)
  return (
    <span className="font-mono text-[10px] text-slate-600 tabular-nums tracking-widest shrink-0">
      {date}&nbsp;{t}
    </span>
  )
}

export function DashboardLayout({ status, activeTab, onTabChange, children }: Props) {
  const cfg = STATUS_CFG[status]

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── System header — row 1: path + status ── */}
        <div className="shrink-0 flex items-center justify-between px-4 h-8 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center font-mono text-[10px] tracking-wider">
            <span className="text-slate-700">VERTIFLOW</span>
            <span className="text-slate-800 mx-2">/</span>
            <span className="text-slate-600">FARM-001</span>
            <span className="text-slate-800 mx-2">/</span>
            <span className="text-slate-500">ZONE-ALPHA</span>
            <span className="text-slate-800 mx-2">/</span>
            <span className="text-emerald-600">NFT-RACK-01</span>
          </div>
          <div className="flex items-center gap-4">
            <SystemClock />
            <span className={`status-badge font-mono ${cfg.cls}`}>{cfg.label}</span>
          </div>
        </div>

        {/* ── System header — row 2: alert ticker ── */}
        <div className="shrink-0 flex items-center px-4 h-6 border-b border-slate-800/70 bg-slate-950/80">
          <AlertTicker />
        </div>

        {/* ── Loading / Error overlay ── */}
        <AnimatePresence>
          {(status === 'connecting' || status === 'disconnected' || status === 'error') && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 pointer-events-none"
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="border border-slate-700 bg-slate-900 px-8 py-6 flex flex-col items-center gap-4 pointer-events-auto"
              >
                {status === 'connecting'
                  ? <Loader2 size={24} className="text-amber-400 animate-spin" />
                  : <WifiOff size={24} className="text-rose-400" />
                }
                <div className="text-center">
                  <p className="font-mono text-xs tracking-[0.15em] text-white uppercase">
                    {status === 'connecting' ? 'AWAITING TELEMETRY STREAM' : 'STREAM DISCONNECTED'}
                  </p>
                  <p className="text-slate-600 text-[10px] mt-1 font-mono tracking-wider">
                    {status === 'connecting'
                      ? 'ws://localhost:8000/ws/telemetry'
                      : 'RETRY IN 3s — CHECK NODE STATUS'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>

      </div>
    </div>
  )
}
