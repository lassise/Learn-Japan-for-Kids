-- Supercharge wave 16: weekly theme cadence control.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS weekly_theme_cadence TEXT NOT NULL DEFAULT 'weekly';

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_weekly_theme_cadence_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_weekly_theme_cadence_check
    CHECK (weekly_theme_cadence IN ('weekly', 'biweekly'));

CREATE INDEX IF NOT EXISTS idx_child_preferences_weekly_theme_cadence
    ON public.child_preferences (weekly_theme_cadence);
