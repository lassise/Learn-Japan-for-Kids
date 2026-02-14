-- Supercharge wave 13: per-child anomaly sensitivity thresholds.

ALTER TABLE public.child_preferences
    ADD COLUMN IF NOT EXISTS anomaly_watch_shortage_delta_pct INT NOT NULL DEFAULT 8,
    ADD COLUMN IF NOT EXISTS anomaly_high_shortage_delta_pct INT NOT NULL DEFAULT 15;

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_anomaly_watch_shortage_delta_pct_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_anomaly_watch_shortage_delta_pct_check
    CHECK (anomaly_watch_shortage_delta_pct BETWEEN 3 AND 30);

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_anomaly_high_shortage_delta_pct_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_anomaly_high_shortage_delta_pct_check
    CHECK (anomaly_high_shortage_delta_pct BETWEEN 5 AND 40);

ALTER TABLE public.child_preferences
    DROP CONSTRAINT IF EXISTS child_preferences_anomaly_delta_order_check;

ALTER TABLE public.child_preferences
    ADD CONSTRAINT child_preferences_anomaly_delta_order_check
    CHECK (anomaly_high_shortage_delta_pct >= anomaly_watch_shortage_delta_pct + 2);

CREATE INDEX IF NOT EXISTS idx_child_preferences_anomaly_thresholds
    ON public.child_preferences (anomaly_watch_shortage_delta_pct, anomaly_high_shortage_delta_pct);
