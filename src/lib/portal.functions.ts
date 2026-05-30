import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const tokenSchema = z.object({ token: z.string().uuid() });

export const getPortalProject = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, description, status, client_name, client_email, color, currency, rate_amount, rate_type, deadline, user_id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");

    const [{ data: contracts }, { data: files }, { data: scope }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("contracts")
        .select("id, title, body, status, total_amount, currency, client_name, client_signature, client_signed_at, freelancer_signature, freelancer_signed_at, sent_at, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("files")
        .select("id, name, mime_type, size_bytes, payment_required, preview_only, storage_path, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("scope_items")
        .select("id, title, description, status, position")
        .eq("project_id", project.id)
        .order("position"),
      supabaseAdmin
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", project.user_id)
        .maybeSingle(),
    ]);

    // Generate signed URLs for non-paywalled files
    const filesWithUrls = await Promise.all(
      (files ?? []).map(async (f) => {
        let url: string | null = null;
        if (!f.payment_required) {
          const { data: signed } = await supabaseAdmin.storage
            .from("project-files")
            .createSignedUrl(f.storage_path, 600);
          url = signed?.signedUrl ?? null;
        }
        return { ...f, url };
      }),
    );

    return {
      project,
      freelancer: profile ?? { display_name: null, avatar_url: null },
      contracts: contracts ?? [],
      files: filesWithUrls,
      scope: scope ?? [],
    };
  });

export const signContractAsClient = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        contractId: z.string().uuid(),
        signature: z.string().min(50).max(500_000),
        clientName: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Verify the contract belongs to the project identified by token
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!project) throw new Error("Invalid token");

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id, status")
      .eq("id", data.contractId)
      .eq("project_id", project.id)
      .maybeSingle();
    if (!contract) throw new Error("Contract not found");
    if (contract.status === "signed") throw new Error("Already signed");

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        client_signature: data.signature,
        client_signed_at: new Date().toISOString(),
        client_name: data.clientName,
        status: "signed",
      })
      .eq("id", data.contractId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
