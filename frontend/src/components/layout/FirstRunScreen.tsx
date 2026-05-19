import React from 'react'
import { Leaf, Plus, Loader2, AlertTriangle, Terminal, RefreshCw, ChevronRight } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { ServerWakeUpConsole } from './ServerWakeUpConsole'

interface FirstRunScreenProps {
  onGoToSettings: () => void
}

export function FirstRunScreen({ onGoToSettings }: FirstRunScreenProps) {
  const { loading, error, spinUpStatus } = useZoneContext()

  // 1. FAST LOADING: standard loading spinner for quick handshakes
  if (loading && !spinUpStatus.isSpinningUp) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-green-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf size={16} className="text-green-500 animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 tracking-wider font-mono animate-pulse">CONNECTING TO NODE...</p>
      </div>
    )
  }

  // 2. SERVER SPINNING UP: gorgeous, detailed wakeup sequence console
  if (loading && spinUpStatus.isSpinningUp) {
    return <ServerWakeUpConsole spinUpStatus={spinUpStatus} />
  }

  // 3. WAKEUP OR CONNECTION FAILED: polished database/network diagnostic screen
  if (error) {
    const isDbError = error.toLowerCase().includes('database')
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-zinc-950 px-6 max-w-lg mx-auto py-8">
        
        {/* Error icon circle */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5 shrink-0">
          <AlertTriangle size={24} className="text-red-400 animate-bounce" />
        </div>

        {/* Diagnostic card */}
        <div className="card w-full p-5 border-red-500/15 bg-red-500/5 shadow-2xl shadow-black/80 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xs font-bold text-red-400 tracking-widest uppercase">
              {isDbError ? 'Database Connection Failed' : 'Connection Link Failed'}
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              The front-end client failed to establish a secure handshake with the node API.
            </p>
          </div>

          <div className="bg-zinc-950 border border-red-950/30 p-3 rounded-xl shadow-inner">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-red-950/40 pb-1">
              <Terminal size={10} className="text-red-400" />
              <span className="text-[8px] font-mono font-bold text-red-500/60 uppercase">API Error Details</span>
            </div>
            <p className="text-[9px] text-zinc-400 font-mono leading-relaxed break-all bg-black/45 p-2 rounded border border-zinc-900 select-all max-h-[80px] overflow-y-auto">
              {error}
            </p>
          </div>
        </div>

        {/* Context-aware suggestions */}
        <div className="text-[11px] text-zinc-500 text-center space-y-3 px-4 leading-relaxed max-w-sm">
          {isDbError ? (
            <>
              <p>VertiFlow requires an active <span className="text-zinc-300 font-semibold">PostgreSQL</span> or <span className="text-zinc-300 font-semibold">TimescaleDB</span> instance to store your telemetry data.</p>
              <div className="bg-zinc-900/60 p-3 rounded-xl text-left font-mono text-[9px] text-zinc-400 border border-zinc-800 shadow-inner">
                <span className="text-zinc-600"># Start local database container:</span><br/>
                <span className="text-emerald-500 font-semibold">docker compose up -d</span>
              </div>
            </>
          ) : (
            <p>Make sure the backend server is reachable. If you're running locally, ensure the server is active on <span className="font-mono text-zinc-400">localhost:8000</span> or verify container status on your hosting provider dashboard.</p>
          )}
        </div>

        {/* Retry CTA */}
        <button 
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] shadow-lg shadow-black/40"
        >
          <RefreshCw size={12} className="text-zinc-400" />
          Recheck Server Handshake
        </button>
      </div>
    )
  }

  // 4. WELCOME SCREEN: Farm onboarding setup
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-zinc-950 px-6 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/5">
          <Leaf size={28} className="text-green-400" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Welcome to VertiFlow</h1>
          <p className="text-xs text-zinc-500 mt-1">Smart Vertical Farm Management Platform</p>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2">
        {[
          { n: 1, title: 'Create your first farm',      desc: 'Give it a name and location' },
          { n: 2, title: 'Add growing zones',            desc: 'Define layers and assign crops' },
          { n: 3, title: 'Configure thresholds',        desc: 'Set optimal sensor ranges' },
          { n: 4, title: 'Connect sensors & devices',   desc: 'Register your IoT hardware' },
        ].map(({ n, title, desc }) => (
          <div key={n} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm">
            <span className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
            <div>
              <p className="text-xs font-semibold text-zinc-200">{title}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onGoToSettings}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-green-900/30 active:scale-[0.98]"
      >
        <Plus size={14} />
        Create Your First Farm
        <ChevronRight size={12} className="opacity-80" />
      </button>

      <p className="text-[10px] text-zinc-700 font-mono">
        Your data is securely isolated by multi-tenant authentication
      </p>
    </div>
  )
}
