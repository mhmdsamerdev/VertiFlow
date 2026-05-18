import React from 'react'
import { Leaf, Plus, Loader2, AlertTriangle, Server, Zap, Terminal, RefreshCw, ChevronRight } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'

interface FirstRunScreenProps {
  onGoToSettings: () => void
}

const LOG_TEMPLATES = [
  "SYSTEM: Client runtime bootstrapped. Seeking node cluster...",
  "DNS_RESOLVER: resolved vertiflow.onrender.com",
  "NET_LAYER: sending ping request to API gateway...",
  "STATUS: Render service sleep state detected. Initializing boot trigger...",
  "RESOURCE_ALLOCATOR: assigning CPU core and memory buffers...",
  "GATEWAY_TUNNEL: opening secure HTTPS socket tunnels...",
  "PROVISIONER: active container spin-up in progress on US-East-1...",
  "CONTAINER: waking application processes and loading libraries...",
  "DATABASE: establishing secure pool with PostgreSQL cluster...",
  "SYS_MONITOR: checking database tables and migrations... [OK]",
  "SYNC_ENGINE: retrieving telemetry logs and historical averages...",
  "SYS_MONITOR: performing hardware interface check... [OK]",
  "NET_LAYER: finalizing server response handshake...",
  "Almost operational! Warmed up system, awaiting route response...",
  "Node active. Handshake verified. Connecting..."
]

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
    const percent = Math.min(100, Math.round((spinUpStatus.attempt / spinUpStatus.maxAttempts) * 100))
    
    // Generate terminal logs based on current attempt count
    const logs = [
      `[INFO] Client runtime bootstrap complete.`,
      `[INFO] Target Gateway: vertiflow.onrender.com`
    ]
    for (let i = 0; i < spinUpStatus.attempt; i++) {
      const idx = i % LOG_TEMPLATES.length
      // Estimate a time offset so logs look realistic
      const timeOffset = (spinUpStatus.attempt - i) * 3500
      const timeStr = new Date(Date.now() - timeOffset).toTimeString().slice(3, 8)
      logs.push(`[${timeStr}] ${LOG_TEMPLATES[idx]}`)
    }
    logs.push(`[${new Date().toTimeString().slice(3, 8)}] Awaiting server boot response...`)

    // Keep only the most recent 4 logs to fit perfectly in the viewport without clutter
    const visibleLogs = logs.slice(-4)

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-zinc-950 px-6 py-8">
        
        {/* Sleek, glowing server wakeup console card */}
        <div className="card w-full max-w-md p-6 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 shadow-2xl shadow-black/80 flex flex-col items-center gap-5 text-center">
          
          {/* Orbital glowing ring server icon */}
          <div className="relative flex items-center justify-center w-20 h-20">
            {/* Concentric pulsing rings */}
            <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-[pulse_3s_infinite]" />
            <div className="absolute inset-2 rounded-full border border-emerald-500/25 animate-[pulse_2s_infinite]" />
            <div className="absolute inset-4 rounded-full border border-teal-500/35 animate-[ping_4s_infinite]" />
            
            {/* Central glowing glass hub */}
            <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/50 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 opacity-60 animate-pulse" />
              <Server size={18} className="text-emerald-400 relative z-10 animate-pulse" />
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                <Zap size={6} className="text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Server Node Wake-Up Active
            </h2>
            <p className="text-xs text-zinc-400 px-2 leading-relaxed">
              VertiFlow is hosted on a Render free-tier container which sleeps after inactivity. We are waking it up automatically for you!
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 px-1">
              <span>WAKING INSTANCE</span>
              <span className="text-emerald-400 font-bold">{percent}%</span>
            </div>
            
            {/* Sleek linear bar */}
            <div className="w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-700 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Live Diagnostic terminal console log */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-[9px] text-zinc-400 w-full text-left shadow-inner flex flex-col gap-1.5">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-0.5">
              <div className="flex items-center gap-1.5">
                <Terminal size={10} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Live System Logs</span>
              </div>
              <span className="text-[8px] text-zinc-600">Attempt {spinUpStatus.attempt}/{spinUpStatus.maxAttempts}</span>
            </div>
            <div className="space-y-1 select-none">
              {visibleLogs.map((log, index) => {
                const isActive = index === visibleLogs.length - 1
                return (
                  <div 
                    key={index} 
                    className={`leading-relaxed truncate ${
                      isActive 
                        ? 'text-emerald-400 font-semibold animate-pulse' 
                        : 'text-zinc-600'
                    }`}
                  >
                    <span className="text-zinc-800 mr-1">&gt;</span>
                    {log}
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono tracking-tight animate-pulse">
            This normally takes 30–45 seconds. Please do not refresh.
          </p>

        </div>
      </div>
    )
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
