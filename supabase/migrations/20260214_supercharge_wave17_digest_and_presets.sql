-- Wave 17: digest thresholds + fallback preset label
-- Safe additive changes on child_preferences.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS fallback_preset_label text NOT NULL DEFAULT 'custom';

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS digest_watch_shortage_delta_pct integer NOT NULL DEFAULT 6;

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS digest_high_shortage_delta_pct integer NOT NULL DEFAULT 12;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_preferences_fallback_preset_label_check'
    ) THEN
        ALTER TABLE public.child_preferences
            ADD CONSTRAINT child_preferences_fallback_preset_label_check
            CHECK (fallback_preset_label IN ('reading_default', 'gentle', 'balanced', 'challenge', 'custom'));
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_preferences_digest_watch_shortage_delta_pct_check'
    ) THEN
        ALTER TABLE public.child_preferences
            ADD CONSTRAINT child_preferences_digest_watch_shortage_delta_pct_check
            CHECK (digest_watch_shortage_delta_pct BETWEEN 3 AND 30);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_preferences_digest_high_shortage_delta_pct_check'
    ) THEN
        ALTER TABLE public.child_preferences
            ADD CONSTRAINT child_preferences_digest_high_shortage_delta_pct_check
            CHECK (digest_high_shortage_delta_pct BETWEEN 5 AND 40);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'child_preferences_digest_threshold_order_check'
    ) THEN
        ALTER TABLE public.child_preferences
            ADD CONSTRAINT child_preferences_digest_threshold_order_check
            CHECK (digest_high_shortage_delta_pct >= digest_watch_shortage_delta_pct + 2);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS child_preferences_fallback_preset_label_idx
    ON public.child_preferences (fallback_preset_label);
