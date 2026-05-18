-- VertiFlow Multi-Tenant & Authentication Migration
-- Adds profiles, user_farms, and invitations tables.

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Nullable for anonymous profiles. Links to auth.users in Supabase.
    browser_id VARCHAR(255) UNIQUE, -- Kept for tracking anonymous sessions.
    easy_share_id VARCHAR(12) UNIQUE, -- E.g., 'VF-8A3B9C'
    full_name VARCHAR(200),
    avatar_url TEXT,
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups on Easy Share ID and Browser ID
CREATE INDEX IF NOT EXISTS idx_profiles_easy_share ON public.profiles(easy_share_id);
CREATE INDEX IF NOT EXISTS idx_profiles_browser_id ON public.profiles(browser_id);

-- 2. Many-to-Many Join Table (user_farms)
CREATE TABLE IF NOT EXISTS public.user_farms (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    farm_id VARCHAR(50) REFERENCES public.farms(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer', -- 'owner', 'admin', 'staff', 'consultant', 'viewer'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_user_farms_farm ON public.user_farms(farm_id);
CREATE INDEX IF NOT EXISTS idx_user_farms_profile ON public.user_farms(profile_id);

-- 3. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id VARCHAR(50) REFERENCES public.farms(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_easy_share_id VARCHAR(12),
    target_email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'revoked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_invitations_easy_share ON public.invitations(target_easy_share_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(target_email);
CREATE INDEX IF NOT EXISTS idx_invitations_farm ON public.invitations(farm_id);
