import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicInvoice = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Invoice not found");

    // Mark viewed (first time only)
    if (!invoice.viewed_at) {
      await supabaseAdmin
        .from("invoices")
        .update({ viewed_at: new Date().toISOString(), status: invoice.status === "sent" ? "viewed" : invoice.status })
        .eq("id", invoice.id);
    }

    const { data: freelancer } = await supabaseAdmin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", invoice.user_id)
      .maybeSingle();

    return { invoice, freelancer: freelancer ?? { display_name: null, avatar_url: null } };
  });

export const recordManualPayment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        payerName: z.string().min(1).max(200),
        payerEmail: z.string().email().max(200),
        method: z.enum(["bank_transfer", "card", "other"]),
        reference: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, user_id, total, currency, amount_paid")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!invoice) throw new Error("Invoice not found");

    const remaining = Number(invoice.total) - Number(invoice.amount_paid);
    if (remaining <= 0) throw new Error("Already paid");

    const { error: pErr } = await supabaseAdmin.from("payments").insert({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      kind: "invoice",
      status: "pending",
      amount: remaining,
      currency: invoice.currency,
      provider: data.method,
      provider_ref: data.reference ?? null,
      payer_name: data.payerName,
      payer_email: data.payerEmail,
    });
    if (pErr) throw new Error(pErr.message);

    return { ok: true };
  });
