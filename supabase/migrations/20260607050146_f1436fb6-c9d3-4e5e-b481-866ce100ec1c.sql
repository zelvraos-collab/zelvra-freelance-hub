
-- Monitoring consent (per user, must accept before tracking)
CREATE TABLE public.monitoring_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL DEFAULT 'v1',
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.monitoring_consent TO authenticated;
GRANT ALL ON public.monitoring_consent TO service_role;
ALTER TABLE public.monitoring_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own consent" ON public.monitoring_consent FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own consent" ON public.monitoring_consent FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Tracked sessions (one per timer run)
CREATE TABLE public.tracked_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- running | paused | stopped | disputed
  start_ip INET,
  end_ip INET,
  start_timezone TEXT,
  start_user_agent TEXT,
  device_fingerprint TEXT,
  activity_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  productivity_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  screenshot_count INTEGER NOT NULL DEFAULT 0,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  entry_hash TEXT, -- sha256 of canonical fields
  client_viewed_at TIMESTAMPTZ,
  locked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tracked_sessions TO authenticated;
GRANT ALL ON public.tracked_sessions TO service_role;
ALTER TABLE public.tracked_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX tracked_sessions_user_idx ON public.tracked_sessions (user_id, started_at DESC);
CREATE INDEX tracked_sessions_project_idx ON public.tracked_sessions (project_id, started_at DESC);

-- Freelancer owns it
CREATE POLICY "freelancer view own sessions" ON public.tracked_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "freelancer insert own sessions" ON public.tracked_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Updates only if not locked (enforced by trigger below)
CREATE POLICY "freelancer update own sessions" ON public.tracked_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid() AND locked = false) WITH CHECK (user_id = auth.uid());
-- Project owner (client side - project.user_id is the freelancer; for now freelancer also views as client)
CREATE POLICY "project owner view sessions" ON public.tracked_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- Activity samples (1 per minute heartbeat)
CREATE TABLE public.activity_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tracked_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  keys_count INTEGER NOT NULL DEFAULT 0,
  mouse_moves INTEGER NOT NULL DEFAULT 0,
  mouse_clicks INTEGER NOT NULL DEFAULT 0,
  scrolls INTEGER NOT NULL DEFAULT 0,
  activity_pct INTEGER NOT NULL DEFAULT 0,
  tab_focused BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_samples TO authenticated;
GRANT ALL ON public.activity_samples TO service_role;
ALTER TABLE public.activity_samples ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_samples_session_idx ON public.activity_samples (session_id, sampled_at);
CREATE POLICY "freelancer manage own samples" ON public.activity_samples FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "project owner view samples" ON public.activity_samples FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracked_sessions s JOIN public.projects p ON p.id = s.project_id WHERE s.id = session_id AND p.user_id = auth.uid()));

-- Screenshots
CREATE TABLE public.session_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tracked_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  storage_path TEXT NOT NULL,
  activity_pct INTEGER NOT NULL DEFAULT 0,
  suspicious BOOLEAN NOT NULL DEFAULT false,
  blurred BOOLEAN NOT NULL DEFAULT false,
  hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.session_screenshots TO authenticated;
GRANT ALL ON public.session_screenshots TO service_role;
ALTER TABLE public.session_screenshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX screenshots_session_idx ON public.session_screenshots (session_id, taken_at);
CREATE POLICY "freelancer view own screenshots" ON public.session_screenshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "freelancer insert own screenshots" ON public.session_screenshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "project owner view screenshots" ON public.session_screenshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracked_sessions s JOIN public.projects p ON p.id = s.project_id WHERE s.id = session_id AND p.user_id = auth.uid()));

-- Audit log for any session edits
CREATE TABLE public.session_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tracked_sessions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- created | edited | paused | resumed | stopped | disputed | flagged
  before JSONB,
  after JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.session_audit TO authenticated;
GRANT ALL ON public.session_audit TO service_role;
ALTER TABLE public.session_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX session_audit_idx ON public.session_audit (session_id, created_at DESC);
CREATE POLICY "involved parties view audit" ON public.session_audit FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.tracked_sessions s JOIN public.projects p ON p.id = s.project_id WHERE s.id = session_id AND (s.user_id = auth.uid() OR p.user_id = auth.uid())));
CREATE POLICY "users insert audit" ON public.session_audit FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Disputes
CREATE TABLE public.session_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tracked_sessions(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  freelancer_response TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved | escalated
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.session_disputes TO authenticated;
GRANT ALL ON public.session_disputes TO service_role;
ALTER TABLE public.session_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "involved parties view disputes" ON public.session_disputes FOR SELECT TO authenticated
  USING (raised_by = auth.uid() OR EXISTS (SELECT 1 FROM public.tracked_sessions s JOIN public.projects p ON p.id = s.project_id WHERE s.id = session_id AND (s.user_id = auth.uid() OR p.user_id = auth.uid())));
CREATE POLICY "users raise disputes" ON public.session_disputes FOR INSERT TO authenticated WITH CHECK (raised_by = auth.uid());
CREATE POLICY "involved parties update disputes" ON public.session_disputes FOR UPDATE TO authenticated
  USING (raised_by = auth.uid() OR EXISTS (SELECT 1 FROM public.tracked_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- Triggers: updated_at
CREATE TRIGGER trg_tracked_sessions_updated BEFORE UPDATE ON public.tracked_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_session_disputes_updated BEFORE UPDATE ON public.session_disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-lock session once client views it
CREATE OR REPLACE FUNCTION public.lock_session_on_client_view() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.client_viewed_at IS NOT NULL AND OLD.client_viewed_at IS NULL THEN
    NEW.locked = true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lock_on_view BEFORE UPDATE ON public.tracked_sessions FOR EACH ROW EXECUTE FUNCTION public.lock_session_on_client_view();

-- Storage bucket created via tool (next step)
