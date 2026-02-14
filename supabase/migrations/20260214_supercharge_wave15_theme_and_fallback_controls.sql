-- Supercharge wave 15: weekly theme override + fallback warning threshold controls.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS weekly_theme_override TEXT NOT NULL DEFAULT 'auto',
    ADD COLUMN IF NOT EXISTS fallback_warning_threshold_pct INT NOT NULL DEFAULT 20;

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_weekly_theme_override_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_weekly_theme_override_check
    CHECK (weekly_theme_override IN ('auto', 'food', 'transport', 'school', 'phrases', 'nature', 'shrines', 'culture', 'general'));

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_fallback_warning_threshold_pct_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_fallback_warning_threshold_pct_check
    CHECK (fallback_warning_threshold_pct BETWEEN 5 AND 60);

CREATE INDEX IF NOT EXISTS idx_child_preferences_weekly_theme_override
    ON public.child_preferences (weekly_theme_override);

CREATE INDEX IF NOT EXISTS idx_child_preferences_fallback_warning_threshold_pct
    ON public.child_preferences (fallback_warning_threshold_pct);
