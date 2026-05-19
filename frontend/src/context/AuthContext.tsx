import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Profile, authApi, Invitation, MemberProfile } from '../api/auth'
import { supabase } from '../auth'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  error: string | null
  invitations: Invitation[]
  invitationsLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (fullName: string, avatarUrl?: string) => Promise<Profile>
  sendInvitation: (farmId: string, role: 'admin' | 'editor' | 'viewer', identifier: string, isEmail: boolean) => Promise<void>
  acceptInvitation: (inviteId: string) => Promise<void>
  declineInvitation: (inviteId: string) => Promise<void>
  loadPendingInvitations: () => Promise<void>
  getFarmMembers: (farmId: string) => Promise<MemberProfile[]>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  // Initialize/load current profile from backend
  const loadProfile = useCallback(async () => {
    setError(null)
    try {
      const prof = await authApi.getProfile()
      setProfile(prof)
    } catch (err: any) {
      console.error('Failed to load profile from backend', err)
      setError(err instanceof Error ? err.message : String(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    // Fetch active session and handle profile fetching
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) {
        loadProfile()
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (session) {
        loadProfile()
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Load pending invitations
  const loadPendingInvitations = useCallback(async () => {
    if (!profile) return
    setInvitationsLoading(true)
    try {
      const pending = await authApi.listPendingInvitations()
      setInvitations(pending)
    } catch (err) {
      console.error('Failed to load pending invitations', err)
    } finally {
      setInvitationsLoading(false)
    }
  }, [profile])

  useEffect(() => {
    if (profile) {
      loadPendingInvitations()
    } else {
      setInvitations([])
    }
  }, [profile, loadPendingInvitations])

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      throw err
    }
  }, [])

  // Sign-Up
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      throw err
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    setLoading(true)
    localStorage.removeItem('vflow_farm_id')
    const { error: err } = await supabase.auth.signOut()
    if (err) {
      console.error('Error signing out', err)
    }
    setProfile(null)
    setInvitations([])
    setLoading(false)
  }, [])

  const updateProfile = useCallback(async (fullName: string, avatarUrl?: string) => {
    try {
      const updated = await authApi.updateProfile({ full_name: fullName, avatar_url: avatarUrl })
      setProfile(updated)
      return updated
    } catch (err: any) {
      console.error('Failed to update profile info', err)
      throw err
    }
  }, [])

  const getFarmMembers = useCallback(async (farmId: string) => {
    return authApi.listFarmMembers(farmId)
  }, [])

  const sendInvitation = useCallback(async (
    farmId: string, 
    role: 'admin' | 'editor' | 'viewer', 
    identifier: string, 
    isEmail: boolean
  ) => {
    const data: any = { farm_id: farmId, role }
    if (isEmail) {
      data.target_email = identifier
    } else {
      data.target_easy_share_id = identifier
    }
    await authApi.inviteMember(data)
  }, [])

  const acceptInvitation = useCallback(async (inviteId: string) => {
    await authApi.acceptInvitation(inviteId)
    await loadPendingInvitations()
  }, [loadPendingInvitations])

  const declineInvitation = useCallback(async (inviteId: string) => {
    await authApi.declineInvitation(inviteId)
    await loadPendingInvitations()
  }, [loadPendingInvitations])

  return (
    <AuthContext.Provider value={{
      profile, loading, error, invitations, invitationsLoading,
      login, signUp, logout, updateProfile, sendInvitation, acceptInvitation, declineInvitation,
      loadPendingInvitations, getFarmMembers
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
