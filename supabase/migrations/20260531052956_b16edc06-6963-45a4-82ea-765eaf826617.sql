-- Invoices, reminders, and payments tables for Phase 5

CREATE TYPE public.invoice_status AS ENUM ('draft','sent','viewed','partially_paid','paid','overdue','void');
CREATE TYPE public.payment_status AS ENUM ('pending','processing','succeeded','failed','refunded');
CREATE TYPE public.payment_kind AS ENUM ('invoice','escrow_deposit','escrow_release','milestone');

-- INVOICES
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  contract_id UUID,
  number TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  freelancer_name TEXT,
  freelancer_address TEXT,
  freelancer_email TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  is_escrow BOOLEAN NOT NULL DEFAULT false,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  terms TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  share_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own invoices" ON public.invoices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own invoices" ON public.invoices FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own invoices" ON public.invoices FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
CREATE INDEX idx_invoices_share_token ON public.invoices(share_token);

-- INVOICE REMINDERS
CREATE TABLE public.invoice_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'email',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_reminders TO authenticated;
GRANT ALL ON public.invoice_reminders TO service_role;
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own reminders" ON public.invoice_reminders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own reminders" ON public.invoice_reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own reminders" ON public.invoice_reminders FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own reminders" ON public.invoice_reminders FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_reminders_invoice ON public.invoice_reminders(invoice_id);

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID,
  project_id UUID,
  kind public.payment_kind NOT NULL DEFAULT 'invoice',
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT,
  provider_ref TEXT,
  payer_name TEXT,
  payer_email TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own payments" ON public.payments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own payments" ON public.payments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- Function: generate next invoice number per user
CREATE OR REPLACE FUNCTION public.next_invoice_number(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '\D', '', 'g'), '')::INT), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE user_id = _user_id;
  RETURN 'INV-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;