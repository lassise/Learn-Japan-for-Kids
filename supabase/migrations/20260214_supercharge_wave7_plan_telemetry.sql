-- Supercharge wave 7: quest plan telemetry for dedupe/variety insights.

CREATE TABLE IF NOT EXISTS public.quest_plan_telemetry (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    date_key DATE NOT NULL,
    topic TEXT NOT NULL,
    total_count INT NOT NULL DEFAULT 0 CHECK (total_count >= 0),
    generated_count INT NOT NULL DEFAULT 0 CHECK (generated_count >= 0),
    remixed_count INT NOT NULL DEFAULT 0 CHECK (remixed_count >= 0),
    shortage_count INT NOT NULL DEFAULT 0 CHECK (shortage_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(child_id, session_key, topic)
);

CREATE INDEX IF NOT EXISTS idx_quest_plan_telemetry_child_date
    ON public.quest_plan_telemetry (child_id, date_key DESC);

CREATE INDEX IF NOT EXISTS idx_quest_plan_telemetry_topic
    ON public.quest_plan_telemetry (child_id, topic, created_at DESC);

ALTER TABLE public.quest_plan_telemetry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_plan_telemetry'
          AND policyname = 'Users can view family quest plan telemetry'
    ) THEN
        CREATE POLICY "Users can view family quest plan telemetry"
        ON public.quest_plan_telemetry
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_plan_telemetry.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'quest_plan_telemetry'
          AND policyname = 'Users can upsert family quest plan telemetry'
    ) THEN
        CREATE POLICY "Users can upsert family quest plan telemetry"
        ON public.quest_plan_telemetry
        FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_plan_telemetry.child_id
                  AND fm.profile_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.quest_plan_telemetry.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
