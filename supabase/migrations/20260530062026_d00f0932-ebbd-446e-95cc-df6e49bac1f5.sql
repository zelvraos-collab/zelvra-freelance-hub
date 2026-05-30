-- Share token for public client portal
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT gen_random_uuid();

-- Enums
DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('draft','sent','signed','declined','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status public.contract_status NOT NULL DEFAULT 'draft',
  total_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  client_name text,
  client_email text,
  freelancer_signature text,
  freelancer_signed_at timestamptz,
  client_signature text,
  client_signed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own contracts" ON public.contracts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own contracts" ON public.contracts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contract appendices
CREATE TABLE public.contract_appendices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  amount numeric,
  status public.contract_status NOT NULL DEFAULT 'draft',
  client_signature text,
  client_signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_appendices TO authenticated;
GRANT ALL ON public.contract_appendices TO service_role;
ALTER TABLE public.contract_appendices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own appendices" ON public.contract_appendices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own appendices" ON public.contract_appendices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own appendices" ON public.contract_appendices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own appendices" ON public.contract_appendices FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_appendices_updated_at BEFORE UPDATE ON public.contract_appendices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Files
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  payment_required boolean NOT NULL DEFAULT false,
  watermark_enabled boolean NOT NULL DEFAULT true,
  preview_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own files" ON public.files FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own files" ON public.files FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own files" ON public.files FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own files" ON public.files FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_files_project ON public.files(project_id);
CREATE INDEX idx_contracts_project ON public.contracts(project_id);
CREATE INDEX idx_appendices_contract ON public.contract_appendices(contract_id);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owner-only by folder = user id
CREATE POLICY "Users read own project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
