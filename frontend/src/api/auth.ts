import { apiFetch } from './client'

export interface Profile {
  id: string
  auth_id: string | null
  easy_share_id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  email?: string | null
}

export interface Farm {
  id: string
  name: string
  location: string
  description: string
  demo_mode: boolean
  created_at: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}

export interface MemberProfile {
  id: string
  easy_share_id: string
  full_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joined_at: string
}

export interface Invitation {
  id: string
  farm_id: string
  invited_by: string
  target_easy_share_id: string | null
  target_email: string | null
  role: 'admin' | 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  farm_name?: string
  invited_by_name?: string
}

export const authApi = {
  getProfile: () =>
    apiFetch<Profile>('/v1/profiles/me'),

  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    apiFetch<Profile>('/v1/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listFarms: () =>
    apiFetch<Farm[]>('/v1/farms'),

  createFarm: (data: { name: string; location?: string; description?: string }) =>
    apiFetch<Farm>('/v1/farms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listFarmMembers: (farmId: string) =>
    apiFetch<MemberProfile[]>(`/v1/farms/${farmId}/members`),

  inviteMember: (data: {
    farm_id: string
    role: 'admin' | 'editor' | 'viewer'
    target_easy_share_id?: string
    target_email?: string
  }) =>
    apiFetch<Invitation>('/v1/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPendingInvitations: () =>
    apiFetch<Invitation[]>('/v1/invitations/pending'),

  acceptInvitation: (inviteId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/v1/invitations/${inviteId}/accept`, {
      method: 'POST',
    }),

  declineInvitation: (inviteId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/v1/invitations/${inviteId}/decline`, {
      method: 'POST',
    }),
}
