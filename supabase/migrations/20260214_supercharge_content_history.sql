-- Supercharge: content history for cross-session dedupe.
CREATE TABLE IF NOT EXISTS public.content_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    content_key TEXT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_history_child_seen_at_desc
    ON public.content_history (child_id, seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_history_child_content_key
    ON public.content_history (child_id, content_key);

ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'content_history'
          AND policyname = 'Users can view family content history'
    ) THEN
        CREATE POLICY "Users can view family content history"
        ON public.content_history
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.content_history.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'content_history'
          AND policyname = 'Users can insert family content history'
    ) THEN
        CREATE POLICY "Users can insert family content history"
        ON public.content_history
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.child_profiles cp
                JOIN public.families f ON cp.family_id = f.id
                JOIN public.family_members fm ON f.id = fm.family_id
                WHERE cp.id = public.content_history.child_id
                  AND fm.profile_id = auth.uid()
            )
        );
    END IF;
END $$;
