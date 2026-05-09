import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Cpu, Server, Wifi, WifiOff } from 'lucide-react'

export function AutomationStatus() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-zinc-400">
          <Cpu size={16} />
          <h3 className="text-xs font-black uppercase tracking-widest">AUTOMATION & SYSTEMS</h3>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Active Rules</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">├─</span>
                <span className="text-zinc-500">Layer 1: If temp {'>'} 26, turn fan ON</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">├─</span>
                <span className="text-zinc-500">Layer 2: If humidity {'>'} 80, vent</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">├─</span>
                <span className="text-zinc-500">Layer 3: If moisture {'<'} 30, water</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">└─</span>
                <span className="text-zinc-500">Layer 4: pH adjustment</span>
                <span className="text-green-500">✓</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Failed Commands (24h)</p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="text-zinc-700">└─</span>
              <span className="text-green-500/50">None</span>
              <span className="text-green-500">✓</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Devices Offline</p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="text-zinc-700">└─</span>
              <span className="text-green-500/50">None</span>
              <span className="text-green-500">✓</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutomationStatus
