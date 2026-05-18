import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Profile, authApi, Invitation, MemberProfile } from '../api/auth'
import { getBrowserId } from '../api/client'

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

function generateMockJWT(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signature = 'mocksignature'
  return `${b64Header}.${b64Payload}.${signature}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  // Initialize/load current profile (anonymous or registered)
  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    const browserId = getBrowserId()
    try {
      // If we don't have a profile yet, initialize an anonymous profile or fetch me
      let prof: Profile
      const token = localStorage.getItem('vflow_jwt_token')
      if (token) {
        prof = await authApi.getProfile()
      } else {
        prof = await authApi.anonymous(browserId)
      }
      setProfile(prof)
    } catch (err: any) {
      console.error('Failed to load profile', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Load pending invitations
  const loadPendingInvitations = useCallback(async () => {
    if (!profile?.is_registered) return
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
    if (profile?.is_registered) {
      loadPendingInvitations()
    }
  }, [profile, loadPendingInvitations])

  // Login/Register (Progressive Onboarding Merge)
  const login = useCallback(async (email: string, fullName: string) => {
    setLoading(true)
    setError(null)
    try {
      const browserId = getBrowserId()
      const mockAuthId = `usr-${Math.random().toString(36).substring(2, 11)}`
      
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
      
      // Execute progressive merge endpoint on backend
      const mergedProfile = await authApi.merge(browserId)
      setProfile(mergedProfile)
      return mergedProfile
    } catch (err: any) {
      localStorage.removeItem('vflow_jwt_token')
      setError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout (revert to a new anonymous profile context)
  const logout = useCallback(async () => {
    setLoading(true)
    localStorage.removeItem('vflow_jwt_token')
    // Clear farm ID so we don't hold active state of registered farms
    localStorage.removeItem('vflow_farm_id')
    setInvitations([])
    const browserId = getBrowserId()
    try {
      const anon = await authApi.anonymous(browserId)
      setProfile(anon)
    } catch (err) {
      console.error('Failed to logout cleanly', err)
    } finally {
      setLoading(false)
    }
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
