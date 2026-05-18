import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Copy, Check, LogOut, Mail, Plus, Users, Bell, Inbox, Key, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useZoneContext } from '../../context/ZoneContext'

export function ProfileDropdown() {
  const { 
    profile, 
    login, 
    logout, 
    invitations, 
    acceptInvitation, 
    declineInvitation,
    sendInvitation
  } = useAuth()
  const { activeFarm, refetch } = useZoneContext()
  
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeView, setActiveView] = useState<'menu' | 'register' | 'invite' | 'inbox'>('menu')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Registration form state
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Invitation form state
  const [inviteIdentifier, setInviteIdentifier] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [inviteIsEmail, setInviteIsEmail] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveView('menu')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyEasyShare = () => {
    if (!profile?.easy_share_id) return
    navigator.clipboard.writeText(profile.easy_share_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regEmail || !regName) return
    setRegLoading(true)
    try {
      await login(regEmail, regName)
      await refetch() // reload multi-tenant farms context
      setActiveView('menu')
    } catch (err) {
      console.error(err)
    } finally {
      setRegLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteIdentifier || !activeFarm) return
    setInviteLoading(true)
    setInviteSuccess(false)
    try {
      await sendInvitation(activeFarm.id, inviteRole, inviteIdentifier, inviteIsEmail)
      setInviteSuccess(true)
      setInviteIdentifier('')
      setTimeout(() => setInviteSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setInviteLoading(false)
    }
  }

  if (!profile) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          profile.is_registered 
            ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/40 text-green-400' 
            : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 text-zinc-300'
        }`}
      >
        <User size={14} className={profile.is_registered ? 'text-green-400 animate-pulse' : 'text-zinc-400'} />
        <span className="text-xs font-semibold tracking-wide">
          {profile.is_registered ? (profile.full_name || 'My Profile') : 'Guest Session'}
        </span>
        {profile.is_registered && invitations.length > 0 && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 z-[60] w-80 card shadow-2xl border border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md p-4 overflow-hidden"
          >
            {activeView === 'menu' && (
              <div className="flex flex-col gap-4">
                {/* Profile Header */}
                <div className="flex flex-col gap-1 pb-3 border-b border-zinc-900">
                  <div className="text-xs text-zinc-500 font-medium">ACCOUNT ID</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-zinc-100 bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-zinc-800 tracking-wider">
                      {profile.easy_share_id}
                    </span>
                    <button
                      onClick={handleCopyEasyShare}
                      className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                      title="Copy Easy Share ID"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Share this ID so team owners can invite you to collaborate on their hydroponic grow rigs.
                  </p>
                </div>

                {/* Progressive Onboarding Trigger */}
                {!profile.is_registered ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 shadow-inner flex flex-col gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-green-400 tracking-wide uppercase">Upgrade Account</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Register to permanently save your farms, setup rules, and invite collaborators.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveView('register')}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-green-500/10"
                    >
                      Sign Up & Save Progress
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Inbox / Invites Badge */}
                    <button
                      onClick={() => setActiveView('inbox')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-800 transition-colors text-zinc-300"
                    >
                      <div className="flex items-center gap-2">
                        <Inbox size={14} className="text-green-400" />
                        <span className="text-xs font-semibold">Invitation Inbox</span>
                      </div>
                      {invitations.length > 0 ? (
                        <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {invitations.length} New
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Empty</span>
                      )}
                    </button>

                    {/* Invite Member to Active Farm */}
                    {activeFarm && (
                      <button
                        onClick={() => setActiveView('invite')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-800 transition-colors text-zinc-300"
                      >
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-green-400" />
                          <span className="text-xs font-semibold">Invite Collaborator</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">Owner</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Logout details */}
                {profile.is_registered && (
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-zinc-900 hover:border-red-500/20 bg-zinc-950 hover:bg-red-500/5 text-zinc-500 hover:text-red-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <LogOut size={13} />
                    Logout Account
                  </button>
                )}
              </div>
            )}

            {/* Registration Progressive Form */}
            {activeView === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-300">UPGRADE PROFILE</span>
                  <button
                    type="button"
                    onClick={() => setActiveView('menu')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Back
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Samuel Green"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="samuel@farm.io"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  {regLoading ? 'Registering...' : 'Complete Progressive Sign Up'}
                </button>
              </form>
            )}

            {/* Invite Form */}
            {activeView === 'invite' && (
              <form onSubmit={handleInviteSubmit} className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-300">INVITE TEAM MEMBER</span>
                  <button
                    type="button"
                    onClick={() => setActiveView('menu')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Back
                  </button>
                </div>

                <div className="flex items-center gap-2 p-0.5 bg-zinc-900 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInviteIsEmail(false)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                      !inviteIsEmail ? 'bg-zinc-800 text-green-400' : 'text-zinc-400'
                    }`}
                  >
                    EASY SHARE ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteIsEmail(true)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                      inviteIsEmail ? 'bg-zinc-800 text-green-400' : 'text-zinc-400'
                    }`}
                  >
                    EMAIL ADDRESS
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">
                      {inviteIsEmail ? 'Email' : 'Easy Share ID'}
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteIdentifier}
                      onChange={e => setInviteIdentifier(e.target.value)}
                      placeholder={inviteIsEmail ? 'team@farm.io' : 'e.g. VF-A9B8C7'}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-green-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">COLLABORATION ROLE</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-green-500/50"
                    >
                      <option value="viewer">Viewer (Read telemetry only)</option>
                      <option value="editor">Editor (Can toggle actuators / rules)</option>
                      <option value="admin">Admin (Can manage devices / alerts)</option>
                    </select>
                  </div>
                </div>

                {inviteSuccess && (
                  <div className="text-[10px] text-center text-green-400 font-semibold">
                    Invitation dispatched successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
                >
                  {inviteLoading ? 'Sending...' : 'Send Collaborator Invite'}
                </button>
              </form>
            )}

            {/* Inbox Popover */}
            {activeView === 'inbox' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-zinc-300">INVITATION INBOX</span>
                  <button
                    type="button"
                    onClick={() => setActiveView('menu')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Back
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="py-8 flex flex-col items-center gap-2 text-zinc-600">
                    <Bell size={20} className="text-zinc-800" />
                    <span className="text-xs">No pending farm invitations.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {invitations.map(invite => (
                      <div 
                        key={invite.id} 
                        className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-900 flex flex-col gap-2"
                      >
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">
                            Join "{invite.farm_name}"
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            Invited by {invite.invited_by_name || 'Team Owner'} as <span className="text-green-400 capitalize">{invite.role}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await acceptInvitation(invite.id)
                              await refetch()
                            }}
                            className="flex-1 py-1 bg-green-500 hover:bg-green-600 text-zinc-950 font-bold text-[10px] rounded-md transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineInvitation(invite.id)}
                            className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-[10px] rounded-md transition-colors border border-zinc-700"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
