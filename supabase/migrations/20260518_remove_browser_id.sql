-- Drop browser_id columns and indexes for strict upfront authentication
DROP INDEX IF EXISTS public.idx_profiles_browser_id;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS browser_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_registered;

ALTER TABLE public.farms DROP COLUMN IF EXISTS browser_id;
ALTER TABLE public.report_schedules DROP COLUMN IF EXISTS browser_id;
ALTER TABLE public.report_schedules ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
