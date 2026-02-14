-- Supercharge wave 11: aggregated family telemetry RPCs and retention verification helper.

CREATE OR REPLACE FUNCTION public.get_family_quest_telemetry_rollup(
    p_family_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ
)
RETURNS TABLE (
    child_id UUID,
    topic TEXT,
    total_count BIGINT,
    generated_count BIGINT,
    remixed_count BIGINT,
    shortage_count BIGINT,
    latest_created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        q.child_id,
        q.topic,
        COALESCE(SUM(q.total_count), 0)::BIGINT AS total_count,
        COALESCE(SUM(q.generated_count), 0)::BIGINT AS generated_count,
        COALESCE(SUM(q.remixed_count), 0)::BIGINT AS remixed_count,
        COALESCE(SUM(q.shortage_count), 0)::BIGINT AS shortage_count,
        MAX(q.created_at) AS latest_created_at
    FROM public.quest_plan_telemetry q
    JOIN public.child_profiles cp ON cp.id = q.child_id
    WHERE cp.family_id = p_family_id
      AND q.created_at >= p_start
      AND q.created_at <= p_end
      AND EXISTS (
          SELECT 1
          FROM public.family_members fm
          WHERE fm.family_id = p_family_id
            AND fm.profile_id = auth.uid()
      )
    GROUP BY q.child_id, q.topic;
$$;

CREATE OR REPLACE FUNCTION public.get_family_quest_telemetry_weekly(
    p_family_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ
)
RETURNS TABLE (
    child_id UUID,
    week_key DATE,
    total_count BIGINT,
    shortage_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        q.child_id,
        DATE_TRUNC('week', q.created_at)::DATE AS week_key,
        COALESCE(SUM(q.total_count), 0)::BIGINT AS total_count,
        COALESCE(SUM(q.shortage_count), 0)::BIGINT AS shortage_count
    FROM public.quest_plan_telemetry q
    JOIN public.child_profiles cp ON cp.id = q.child_id
    WHERE cp.family_id = p_family_id
      AND q.created_at >= p_start
      AND q.created_at <= p_end
      AND EXISTS (
          SELECT 1
          FROM public.family_members fm
          WHERE fm.family_id = p_family_id
            AND fm.profile_id = auth.uid()
      )
    GROUP BY q.child_id, DATE_TRUNC('week', q.created_at)::DATE;
$$;

CREATE OR REPLACE FUNCTION public.verify_supercharge_retention(
    p_keep_days INT DEFAULT 180,
    p_execute_prune BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    before_plan INT := 0;
    before_segment INT := 0;
    before_adaptive INT := 0;
    before_adaptive_topic INT := 0;
    before_transcript INT := 0;
    after_plan INT := 0;
    after_segment INT := 0;
    after_adaptive INT := 0;
    after_adaptive_topic INT := 0;
    after_transcript INT := 0;
    prune_result JSONB := '{}'::JSONB;
BEGIN
    SELECT COUNT(*) INTO before_plan FROM public.quest_plan_telemetry;
    SELECT COUNT(*) INTO before_segment FROM public.quest_segment_events;
    SELECT COUNT(*) INTO before_adaptive FROM public.adaptive_pacing_events;
    SELECT COUNT(*) INTO before_adaptive_topic FROM public.adaptive_topic_pacing_events;
    SELECT COUNT(*) INTO before_transcript FROM public.quest_session_transcripts;

    IF p_execute_prune THEN
        prune_result := public.prune_supercharge_telemetry(p_keep_days);
    END IF;

    SELECT COUNT(*) INTO after_plan FROM public.quest_plan_telemetry;
    SELECT COUNT(*) INTO after_segment FROM public.quest_segment_events;
    SELECT COUNT(*) INTO after_adaptive FROM public.adaptive_pacing_events;
    SELECT COUNT(*) INTO after_adaptive_topic FROM public.adaptive_topic_pacing_events;
    SELECT COUNT(*) INTO after_transcript FROM public.quest_session_transcripts;

    RETURN jsonb_build_object(
        'executed_prune', p_execute_prune,
        'before', jsonb_build_object(
            'quest_plan_telemetry', before_plan,
            'quest_segment_events', before_segment,
            'adaptive_pacing_events', before_adaptive,
            'adaptive_topic_pacing_events', before_adaptive_topic,
            'quest_session_transcripts', before_transcript
        ),
        'after', jsonb_build_object(
            'quest_plan_telemetry', after_plan,
            'quest_segment_events', after_segment,
            'adaptive_pacing_events', after_adaptive,
            'adaptive_topic_pacing_events', after_adaptive_topic,
            'quest_session_transcripts', after_transcript
        ),
        'delta', jsonb_build_object(
            'quest_plan_telemetry', (after_plan - before_plan),
            'quest_segment_events', (after_segment - before_segment),
            'adaptive_pacing_events', (after_adaptive - before_adaptive),
            'adaptive_topic_pacing_events', (after_adaptive_topic - before_adaptive_topic),
            'quest_session_transcripts', (after_transcript - before_transcript)
        ),
        'prune_result', prune_result
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_family_quest_telemetry_rollup(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_family_quest_telemetry_weekly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_supercharge_retention(INT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_family_quest_telemetry_rollup(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_quest_telemetry_rollup(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_family_quest_telemetry_weekly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_quest_telemetry_weekly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_supercharge_retention(INT, BOOLEAN) TO service_role;
