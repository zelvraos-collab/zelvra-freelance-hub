import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const tokenSchema = z.object({ token: z.string().uuid() });

export const getPortalMessages = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!project) throw new Error("Invalid token");
    const { data: msgs, error } = await supabaseAdmin
      .from("messages")
      .select("id, body, sender_name, sender_role, created_at, attachment_url")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const sendPortalMessage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().uuid(),
        body: z.string().min(1).max(4000),
        senderName: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, title")
      .eq("share_token", data.token)
      .maybeSingle();
    if (!project) throw new Error("Invalid token");

    const { data: msg, error } = await supabaseAdmin
      .from("messages")
      .insert({
        project_id: project.id,
        user_id: project.user_id,
        sender_id: null,
        sender_name: data.senderName,
        sender_role: "client",
        body: data.body,
      })
      .select("id, body, sender_name, sender_role, created_at, attachment_url")
      .single();
    if (error) throw new Error(error.message);

    // Notify the freelancer
    await supabaseAdmin.from("notifications").insert({
      user_id: project.user_id,
      kind: "message",
      title: `New message from ${data.senderName}`,
      body: data.body.slice(0, 160),
      link: `/projects/${project.id}`,
    });

    return { message: msg };
  });
