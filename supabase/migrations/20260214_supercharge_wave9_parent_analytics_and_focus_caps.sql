-- Supercharge wave 9: adaptive pacing trend events + focus pack cap controls.

CREATE TABLE IF NOT EXISTS public.adaptive_pacing_events (
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    accuracy NUMERIC(5,4) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    average_difficulty NUMERIC(5,4) NOT NULL CHECK (average_difficulty >= 1 AND average_difficulty <= 3),
    shift INT NOT NULL CHECK (shift IN (-1, 0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (child_id, session_key)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_pacing_events_child_created
    ON public.adaptive_pacing_events (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adaptive_pacing_events_created
    ON public.adaptive_pacing_events (created_at DESC);

ALTER TABLE public.adaptive_pacing_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_pacing_events'
          AND policyname = 'Users can view family adaptive pacing events'
    ) THEN
        CREATE POLICY "Users can view family adaptive pacing events"
        ON public.adaptive_pacing_events
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_pacing_events'
          AND policyname = 'Users can upsert family adaptive pacing events'
    ) THEN
        CREATE POLICY "Users can upsert family adaptive pacing events"
        ON public.adaptive_pacing_events
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS max_focus_recovery_packs INT DEFAULT 2;

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_max_focus_recovery_packs_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_max_focus_recovery_packs_check
    CHECK (max_focus_recovery_packs IN (1, 2, 3, 4));
