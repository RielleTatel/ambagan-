-- Track when each default_stage was last transitioned so the reconciler can
-- avoid double-notifying on the same stage in the same day.
alter table public.loans
  add column if not exists default_stage_updated_at timestamptz;

-- Track when a user's credit score was last recomputed so we can skip work
-- when it was already refreshed in the last hour.
alter table public.profiles
  add column if not exists credit_score_updated_at timestamptz;
