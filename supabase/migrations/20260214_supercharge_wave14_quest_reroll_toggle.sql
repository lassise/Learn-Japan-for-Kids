-- Supercharge wave 14: parent toggle for daily quest reroll safety control.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS allow_daily_quest_reroll BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_child_preferences_allow_daily_quest_reroll
    ON public.child_preferences (allow_daily_quest_reroll);
