-- Supercharge wave 12: branch-aware topic pacing persistence and anomaly acknowledgement controls.

ALTER TABLE public.adaptive_topic_pacing_events
    ADD COLUMN IF NOT EXISTS branch_key TEXT NOT NULL DEFAULT 'unassigned',
    ADD COLUMN IF NOT EXISTS branch_name TEXT NOT NULL DEFAULT 'General';

DO $$
DECLARE
    v_has_old_pk BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'adaptive_topic_pacing_events'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.constraint_name = 'adaptive_topic_pacing_events_pkey'
    ) INTO v_has_old_pk;

    IF v_has_old_pk THEN
        ALTER TABLE public.adaptive_topic_pacing_events
            DROP CONSTRAINT adaptive_topic_pacing_events_pkey;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'adaptive_topic_pacing_events'
          AND tc.constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.adaptive_topic_pacing_events
            ADD CONSTRAINT adaptive_topic_pacing_events_pkey
            PRIMARY KEY (child_id, session_key, topic, branch_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_adaptive_topic_pacing_events_branch_created
    ON public.adaptive_topic_pacing_events (branch_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.child_anomaly_alert_controls (
    child_id UUID PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    muted_until TIMESTAMPTZ NULL,
    mute_reason TEXT NULL CHECK (char_length(mute_reason) <= 120),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_anomaly_alert_controls_muted_until
    ON public.child_anomaly_alert_controls (muted_until DESC);

ALTER TABLE public.child_anomaly_alert_controls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'child_anomaly_alert_controls'
          AND policyname = 'Users can view family anomaly alert controls'
    ) THEN
        CREATE POLICY "Users can view family anomaly alert controls"
        ON public.child_anomaly_alert_controls
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_anomaly_alert_controls.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'child_anomaly_alert_controls'
          AND policyname = 'Users can upsert family anomaly alert controls'
    ) THEN
        CREATE POLICY "Users can upsert family anomaly alert controls"
        ON public.child_anomaly_alert_controls
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_anomaly_alert_controls.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.child_anomaly_alert_controls.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
