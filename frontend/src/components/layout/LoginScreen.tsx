import React, { useState } from 'react'
import { Leaf, Mail, User, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

type ActiveState = 'signin' | 'signup' | 'forgot'

export function LoginScreen() {
  const { login, signUp } = useAuth()
  const [state, setState] = useState<ActiveState>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleStateChange = (newState: ActiveState) => {
    setState(newState)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const sanitizedEmail = email.trim().toLowerCase()

    try {
      if (state === 'signin') {
        if (!sanitizedEmail || !password) return
        await login(sanitizedEmail, password)
      } else if (state === 'signup') {
        if (!sanitizedEmail || !password || !fullName.trim()) return
        await signUp(sanitizedEmail, password, fullName.trim())
        // Success state for signUp
        setSuccessMessage('Account created successfully! Check your email to confirm.')
        setState('signin')
      } else if (state === 'forgot') {
        if (!sanitizedEmail) return
        // Simulated password-reset toast feedback notice
        setSuccessMessage(`A password reset link has been simulated for: ${sanitizedEmail}`)
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden animate-fadeIn font-sans">
      {/* Dynamic Background HSL Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-green-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Premium Dark Glassmorphism Card */}
      <div className="w-full max-w-md p-8 rounded-3xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 relative transition-all duration-300">
        
        {/* Decorative Top Accent Light */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        {/* Logo and Headings */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 transition-transform hover:scale-105 duration-300">
            <Leaf size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">VertiFlow</h1>
            <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider mt-1">
              IoT Vertical Farm Management Platform
            </p>
          </div>
        </div>

        {/* Dynamic Card Header based on view state */}
        <div className="text-center w-full mt-2">
          <h2 className="text-lg font-bold text-zinc-200">
            {state === 'signin' && 'Welcome Back'}
            {state === 'signup' && 'Create Account'}
            {state === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {state === 'signin' && 'Access your farm management console'}
            {state === 'signup' && 'Register now to begin monitoring your rigs'}
            {state === 'forgot' && 'Enter your email to obtain a reset link'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="w-full p-3.5 text-xs rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="w-full p-3.5 text-xs rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-center font-medium animate-fadeIn">
            {successMessage}
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          
          {/* SIGN-UP ONLY: Full Name field */}
          {state === 'signup' && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">
                Full Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Samuel Green"
                  className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* ALL STATES: Email Address field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">
              Email Address
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="samuel@farm.io"
                className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* SIGN-IN and SIGN-UP ONLY: Password field */}
          {state !== 'forgot' && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">
                  Password
                </label>
                {state === 'signin' && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleStateChange('forgot')}
                    className="text-[10px] text-emerald-400 font-bold hover:underline hover:text-emerald-300 disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={state === 'signup' ? 'Create a strong password' : '••••••••'}
                  className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Submission Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-zinc-950" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {state === 'signin' && 'Sign In to VertiFlow'}
                  {state === 'signup' && 'Create VertiFlow Account'}
                  {state === 'forgot' && 'Reset Password'}
                </span>
                <ArrowRight size={14} className="text-zinc-950" />
              </>
            )}
          </button>
        </form>

        {/* Bottom Card Footer Toggle Link */}
        <div className="w-full border-t border-zinc-800/80 pt-4 flex justify-center text-xs">
          {state === 'forgot' ? (
            <button
              disabled={loading}
              onClick={() => handleStateChange('signin')}
              className="flex items-center gap-1.5 text-zinc-400 font-bold hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={13} />
              Back to Sign In
            </button>
          ) : (
            <p className="text-zinc-500 font-medium">
              {state === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                disabled={loading}
                onClick={() => handleStateChange(state === 'signin' ? 'signup' : 'signin')}
                className="text-emerald-400 font-bold hover:underline hover:text-emerald-300 ml-1 transition-colors disabled:opacity-50"
              >
                {state === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
