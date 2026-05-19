-- Rebuild profiles table to point public.profiles.id to auth.users.id
-- Drop dependent tables first to allow schema recreation
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.user_farms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Recreate Profiles Table pointing to auth.users(id)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    easy_share_id VARCHAR(12) UNIQUE, -- E.g. 'VF-A9B8C7'
    full_name VARCHAR(200),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_easy_share ON public.profiles(easy_share_id);

-- 2. Recreate Many-to-Many Join Table (user_farms)
CREATE TABLE public.user_farms (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    farm_id VARCHAR(50) REFERENCES public.farms(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_user_farms_farm ON public.user_farms(farm_id);
CREATE INDEX IF NOT EXISTS idx_user_farms_profile ON public.user_farms(profile_id);

-- 3. Recreate Invitations Table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id VARCHAR(50) REFERENCES public.farms(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_easy_share_id VARCHAR(12),
    target_email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_invitations_easy_share ON public.invitations(target_easy_share_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(target_email);
CREATE INDEX IF NOT EXISTS idx_invitations_farm ON public.invitations(farm_id);

-- 4. Trigger Function and Trigger for AFTER INSERT on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    easy_id VARCHAR(12);
    is_unique BOOLEAN := FALSE;
BEGIN
    -- Loop to generate a unique easy_share_id
    WHILE NOT is_unique LOOP
        easy_id := 'VF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        -- Check if easy_share_id already exists in public.profiles
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE easy_share_id = easy_id) THEN
            is_unique := TRUE;
        END IF;
    END WHILE;

    INSERT INTO public.profiles (id, easy_share_id, full_name, avatar_url, created_at, updated_at)
    VALUES (
        new.id,
        easy_id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
