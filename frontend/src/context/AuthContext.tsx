import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Profile, authApi, Invitation, MemberProfile } from '../api/auth'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  error: string | null
  invitations: Invitation[]
  invitationsLoading: boolean
  
  // Actions
  login: (email: string, fullName: string) => Promise<Profile>
  logout: () => void
  updateProfile: (fullName: string, avatarUrl?: string) => Promise<Profile>
  sendInvitation: (farmId: string, role: 'admin' | 'editor' | 'viewer', identifier: string, isEmail: boolean) => Promise<void>
  acceptInvitation: (inviteId: string) => Promise<void>
  declineInvitation: (inviteId: string) => Promise<void>
  loadPendingInvitations: () => Promise<void>
  getFarmMembers: (farmId: string) => Promise<MemberProfile[]>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function generateMockUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function generateMockJWT(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signature = 'bW9ja3NpZ25hdHVyZQ'
  return `${b64Header}.${b64Payload}.${signature}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  // Initialize/load current profile
  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('vflow_jwt_token')
      if (token) {
        const prof = await authApi.getProfile()
        setProfile(prof)
      } else {
        setProfile(null)
      }
    } catch (err: any) {
      console.error('Failed to load profile', err)
      localStorage.removeItem('vflow_jwt_token')
      setError(err instanceof Error ? err.message : String(err))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
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

  // Login/Register (Mandatory upfront login)
  const login = useCallback(async (email: string, fullName: string) => {
    setLoading(true)
    setError(null)
    try {
      const mockAuthId = generateMockUUID()
      
      // Generate a mock Supabase JWT token that our backend can decode and verify
      const tokenPayload = {
        sub: mockAuthId,
        email,
        user_metadata: {
          full_name: fullName,
        },
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
      }
      const token = generateMockJWT(tokenPayload)
      
      // Save token in localStorage so subsequent fetch calls automatically include it
      localStorage.setItem('vflow_jwt_token', token)
      
      const loggedProfile = await authApi.getProfile()
      setProfile(loggedProfile)
      return loggedProfile
    } catch (err: any) {
      localStorage.removeItem('vflow_jwt_token')
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('vflow_jwt_token')
    localStorage.removeItem('vflow_farm_id')
    setProfile(null)
    setInvitations([])
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
      login, logout, updateProfile, sendInvitation, acceptInvitation, declineInvitation,
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
