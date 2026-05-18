import React, { useState } from 'react'
import { Leaf, Mail, User, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !fullName) return
    setLoading(true)
    setError(null)
    try {
      await login(email, fullName)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden animate-fadeIn">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sleek Central Card */}
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md shadow-2xl flex flex-col items-center gap-6 relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/5">
            <Leaf size={28} className="text-green-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">VertiFlow</h1>
            <p className="text-xs text-zinc-500 mt-1">IoT Vertical Farm Management Platform</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mt-2">
          {error && (
            <div className="p-3 text-xs rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-center font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Samuel Green"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="samuel@farm.io"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-green-500 hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-zinc-950" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to VertiFlow</span>
                <ArrowRight size={14} className="text-zinc-950" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
