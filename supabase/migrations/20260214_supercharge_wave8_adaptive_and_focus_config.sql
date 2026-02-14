-- Supercharge wave 8: server-backed adaptive difficulty + parent focus recovery controls.

CREATE TABLE IF NOT EXISTS public.adaptive_difficulty_profiles (
    child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    sessions INT NOT NULL DEFAULT 0 CHECK (sessions >= 0),
    rolling_accuracy NUMERIC(5,4) NOT NULL DEFAULT 0.7000 CHECK (rolling_accuracy >= 0 AND rolling_accuracy <= 1),
    rolling_difficulty NUMERIC(5,4) NOT NULL DEFAULT 2.0000 CHECK (rolling_difficulty >= 1 AND rolling_difficulty <= 3),
    shift INT NOT NULL DEFAULT 0 CHECK (shift IN (-1, 0, 1)),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_difficulty_profiles_shift
    ON public.adaptive_difficulty_profiles (shift, updated_at DESC);

ALTER TABLE public.adaptive_difficulty_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_difficulty_profiles'
          AND policyname = 'Users can view family adaptive difficulty profiles'
    ) THEN
        CREATE POLICY "Users can view family adaptive difficulty profiles"
        ON public.adaptive_difficulty_profiles
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_difficulty_profiles.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_difficulty_profiles'
          AND policyname = 'Users can upsert family adaptive difficulty profiles'
    ) THEN
        CREATE POLICY "Users can upsert family adaptive difficulty profiles"
        ON public.adaptive_difficulty_profiles
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_difficulty_profiles.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_difficulty_profiles.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS focus_recovery_threshold INT DEFAULT 3;

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_focus_recovery_threshold_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_focus_recovery_threshold_check
    CHECK (focus_recovery_threshold IN (2, 3, 4, 5));
