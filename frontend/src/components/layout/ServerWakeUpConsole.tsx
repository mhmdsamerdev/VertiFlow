import React from 'react'
import { Server, Zap, Terminal } from 'lucide-react'
import { SpinUpStatus } from '../../api/client'

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

interface ServerWakeUpConsoleProps {
  spinUpStatus: SpinUpStatus
}

export function ServerWakeUpConsole({ spinUpStatus }: ServerWakeUpConsoleProps) {
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
