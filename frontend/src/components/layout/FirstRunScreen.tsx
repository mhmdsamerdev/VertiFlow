import React from 'react'
import { Leaf, Plus, Loader2, AlertTriangle } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'

interface FirstRunScreenProps {
  onGoToSettings: () => void
}

export function FirstRunScreen({ onGoToSettings }: FirstRunScreenProps) {
  const { loading, error } = useZoneContext()

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <Loader2 size={32} className="text-green-500 animate-spin" />
        <p className="text-sm text-zinc-500">Connecting to VertiFlow…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Could not connect to backend</p>
            <p className="text-xs text-red-400/70 mt-0.5 font-mono">{error}</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 max-w-xs text-center">
          Make sure the backend server is running on <span className="font-mono text-zinc-500">localhost:8000</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-zinc-950 px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Leaf size={32} className="text-green-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Welcome to VertiFlow</h1>
          <p className="text-sm text-zinc-500 mt-1">Smart Vertical Farm Management Platform</p>
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
          <div key={n} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="w-6 h-6 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onGoToSettings}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-900/30"
      >
        <Plus size={18} />
        Create Your First Farm
      </button>

      <p className="text-xs text-zinc-700">
        All data is stored locally in your PostgreSQL database
      </p>
    </div>
  )
}
