-- Wave 19: enforce optional ultra-short quest preference per child profile.
-- Safe additive change on child_preferences.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS ultra_short_only BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_child_preferences_ultra_short_only
    ON public.child_preferences (ultra_short_only);
