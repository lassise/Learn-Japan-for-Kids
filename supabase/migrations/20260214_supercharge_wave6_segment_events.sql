-- Supercharge wave 6: segment-level telemetry events for quest tuning.

CREATE TABLE IF NOT EXISTS public.quest_segment_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    segment_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('sixty', 'seventy_five', 'ninety')),
    event_type TEXT NOT NULL CHECK (event_type IN ('segment_started', 'segment_completed')),
    topic TEXT NOT NULL,
    activity_index INT NOT NULL DEFAULT 0 CHECK (activity_index >= 0),
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(child_id, session_key, segment_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_quest_segment_events_child_created
    ON public.quest_segment_events (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quest_segment_events_session
    ON public.quest_segment_events (child_id, session_key);

ALTER TABLE public.quest_segment_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_segment_events'
          AND policyname = 'Users can view family quest segment events'
    ) THEN
        CREATE POLICY "Users can view family quest segment events"
        ON public.quest_segment_events
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_segment_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_segment_events'
          AND policyname = 'Users can upsert family quest segment events'
    ) THEN
        CREATE POLICY "Users can upsert family quest segment events"
        ON public.quest_segment_events
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_segment_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_segment_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
