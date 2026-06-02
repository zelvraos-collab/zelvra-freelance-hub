import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are Zelvra Copilot — an AI assistant for freelancers. You help with:
- Drafting contracts, scope-of-work, and project proposals
- Suggesting prices and hourly rates based on scope
- Writing professional follow-up emails (gentle nudges, payment reminders, scope clarifications)
- Detecting scope creep in client conversations and recommending change-order language
- Summarizing long client threads and project status

Be concise, warm, and concrete. Always format responses in Markdown. When asked to draft something, return the draft directly — no preamble. When given project context, use it.`;

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: authHeader } } },
          );
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData.user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }

          const body = await request.json();
          const messages = Array.isArray(body?.messages) ? body.messages : [];
          const projectContext: string | undefined = body?.projectContext;

          const systemContent = projectContext
            ? `${SYSTEM_PROMPT}\n\nCurrent project context:\n${projectContext}`
            : SYSTEM_PROMPT;

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500 });
          }

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              messages: [{ role: "system", content: systemContent }, ...messages],
            }),
          });

          if (!resp.ok) {
            if (resp.status === 429)
              return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), { status: 429 });
            if (resp.status === 402)
              return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402 });
            const t = await resp.text();
            console.error("AI gateway error", resp.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
          }

          return new Response(resp.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          console.error("ai-chat error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500 });
        }
      },
    },
  },
});
