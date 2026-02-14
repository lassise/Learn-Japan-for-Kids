-- Supercharge wave 5: parent topic controls, session limits, accessibility + TTS preferences.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS allowed_topics TEXT[] DEFAULT ARRAY['food','transport','school','phrases','nature','shrines','culture','general']::TEXT[],
    ADD COLUMN IF NOT EXISTS session_limit_minutes INT DEFAULT 90,
    ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dyslexia_font BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tts_auto_read BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tts_rate_preset TEXT DEFAULT 'normal';

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_session_limit_minutes_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_session_limit_minutes_check
    CHECK (session_limit_minutes IN (30, 45, 60, 75, 90, 120));

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_tts_rate_preset_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_tts_rate_preset_check
    CHECK (tts_rate_preset IN ('slow', 'normal', 'clear'));

CREATE INDEX IF NOT EXISTS idx_child_preferences_safe_mode
    ON public.child_preferences (safe_mode);
