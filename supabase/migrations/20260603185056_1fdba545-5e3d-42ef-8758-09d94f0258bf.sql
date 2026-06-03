
CREATE TYPE public.change_order_status AS ENUM ('proposed','accepted','rejected','converted');

CREATE TABLE public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status public.change_order_status NOT NULL DEFAULT 'proposed',
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_orders_project ON public.change_orders(project_id);
CREATE INDEX idx_change_orders_user ON public.change_orders(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_orders TO authenticated;
GRANT ALL ON public.change_orders TO service_role;

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own change_orders" ON public.change_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own change_orders" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own change_orders" ON public.change_orders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own change_orders" ON public.change_orders FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
