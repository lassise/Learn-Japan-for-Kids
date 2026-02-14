-- Supercharge wave 10: topic pacing comparison, session transcript export, and telemetry maintenance.

CREATE TABLE IF NOT EXISTS public.adaptive_topic_pacing_events (
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    topic TEXT NOT NULL,
    answers INT NOT NULL CHECK (answers >= 0),
    correct_answers INT NOT NULL CHECK (correct_answers >= 0),
    accuracy NUMERIC(5,4) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    average_difficulty NUMERIC(5,4) NOT NULL CHECK (average_difficulty >= 1 AND average_difficulty <= 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (child_id, session_key, topic)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_topic_pacing_events_child_created
    ON public.adaptive_topic_pacing_events (child_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adaptive_topic_pacing_events_topic_created
    ON public.adaptive_topic_pacing_events (topic, created_at DESC);

ALTER TABLE public.adaptive_topic_pacing_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_topic_pacing_events'
          AND policyname = 'Users can view family adaptive topic pacing events'
    ) THEN
        CREATE POLICY "Users can view family adaptive topic pacing events"
        ON public.adaptive_topic_pacing_events
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_topic_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_topic_pacing_events'
          AND policyname = 'Users can upsert family adaptive topic pacing events'
    ) THEN
        CREATE POLICY "Users can upsert family adaptive topic pacing events"
        ON public.adaptive_topic_pacing_events
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_topic_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.adaptive_topic_pacing_events.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quest_session_transcripts (
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    date_key DATE NOT NULL,
    transcript_rows JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (child_id, session_key)
);

CREATE INDEX IF NOT EXISTS idx_quest_session_transcripts_child_date
    ON public.quest_session_transcripts (child_id, date_key DESC);

ALTER TABLE public.quest_session_transcripts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_session_transcripts'
          AND policyname = 'Users can view family quest session transcripts'
    ) THEN
        CREATE POLICY "Users can view family quest session transcripts"
        ON public.quest_session_transcripts
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_session_transcripts.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_session_transcripts'
          AND policyname = 'Users can upsert family quest session transcripts'
    ) THEN
        CREATE POLICY "Users can upsert family quest session transcripts"
        ON public.quest_session_transcripts
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_session_transcripts.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_session_transcripts.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prune_supercharge_telemetry(p_keep_days INT DEFAULT 180)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ := NOW() - make_interval(days => GREATEST(30, p_keep_days));
    v_plan_deleted INT := 0;
    v_segment_deleted INT := 0;
    v_adaptive_deleted INT := 0;
    v_adaptive_topic_deleted INT := 0;
    v_transcript_deleted INT := 0;
BEGIN
    DELETE FROM public.quest_plan_telemetry WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_plan_deleted = ROW_COUNT;

    DELETE FROM public.quest_segment_events WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_segment_deleted = ROW_COUNT;

    DELETE FROM public.adaptive_pacing_events WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_adaptive_deleted = ROW_COUNT;

    DELETE FROM public.adaptive_topic_pacing_events WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_adaptive_topic_deleted = ROW_COUNT;

    DELETE FROM public.quest_session_transcripts WHERE created_at < (v_cutoff - INTERVAL '90 days');
    GET DIAGNOSTICS v_transcript_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'cutoff', v_cutoff,
        'quest_plan_telemetry_deleted', v_plan_deleted,
        'quest_segment_events_deleted', v_segment_deleted,
        'adaptive_pacing_events_deleted', v_adaptive_deleted,
        'adaptive_topic_pacing_events_deleted', v_adaptive_topic_deleted,
        'quest_session_transcripts_deleted', v_transcript_deleted
    );
END;
$$;
