import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Profile, authApi, Invitation, MemberProfile } from '../api/auth'
import { supabase } from '../auth'

interface AuthContextValue {
  profile: Profile | null
  userProfile: Profile | null
  isAuthenticated: boolean
  isNewUser: boolean
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
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  // Initialize/load current profile from backend
  const loadProfile = useCallback(async () => {
    setError(null)
    let attempts = 0
    const maxAttempts = 3
    let prof: Profile | null = null

    while (attempts < maxAttempts) {
      try {
        prof = await authApi.getProfile()
        break
      } catch (err: any) {
        attempts++
        if (attempts >= maxAttempts) {
          console.error('Failed to load profile from backend', err)
          setError(err instanceof Error ? err.message : String(err))
          setProfile(null)
          setUserProfile(null)
          setIsAuthenticated(false)
          setLoading(false)
          // Clean up the local session to prevent split-state bug
          await supabase.auth.signOut()
          return
        }
        console.warn(`Profile fetch attempt ${attempts} failed, retrying in 500ms...`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (prof) {
      setProfile(prof)
      setUserProfile(prof)
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    // Listen for auth state changes (automatically triggers INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      if (session) {
        setIsAuthenticated(true)
        setIsNewUser(session.user?.user_metadata?.is_first_time === true)
        await loadProfile()
      } else {
        setProfile(null)
        setUserProfile(null)
        setIsAuthenticated(false)
        setIsNewUser(false)
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
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Sign-Up
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setError(null)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_first_time: true,
        }
      }
    })
    if (err) {
      setError(err.message)
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
    setUserProfile(null)
    setIsAuthenticated(false)
    setIsNewUser(false)
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
      profile, userProfile, isAuthenticated, isNewUser, loading, error, invitations, invitationsLoading,
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
