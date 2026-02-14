-- Supercharge wave 4: mini quest remote persistence + parent safety mode.

CREATE TABLE IF NOT EXISTS public.mini_quest_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    date_key DATE NOT NULL,
    quest_id TEXT NOT NULL,
    progress_value INT NOT NULL DEFAULT 0,
    target_value INT NOT NULL DEFAULT 1,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(child_id, date_key, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_quest_progress_child_date
    ON public.mini_quest_progress (child_id, date_key DESC);

CREATE TABLE IF NOT EXISTS public.child_preferences (
    child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    safe_mode TEXT NOT NULL DEFAULT 'basic' CHECK (safe_mode IN ('basic', 'strict')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mini_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mini_quest_progress'
          AND policyname = 'Users can view family mini quest progress'
    ) THEN
        CREATE POLICY "Users can view family mini quest progress"
        ON public.mini_quest_progress
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.mini_quest_progress.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mini_quest_progress'
          AND policyname = 'Users can upsert family mini quest progress'
    ) THEN
        CREATE POLICY "Users can upsert family mini quest progress"
        ON public.mini_quest_progress
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.mini_quest_progress.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.mini_quest_progress.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'child_preferences'
          AND policyname = 'Users can view family child preferences'
    ) THEN
        CREATE POLICY "Users can view family child preferences"
        ON public.child_preferences
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_preferences.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'child_preferences'
          AND policyname = 'Users can upsert family child preferences'
    ) THEN
        CREATE POLICY "Users can upsert family child preferences"
        ON public.child_preferences
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_preferences.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_preferences.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
