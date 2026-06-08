import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are Zelvra Voice — a voice-controlled assistant for freelancers using the Zelvra app.

You receive a user's spoken transcript (English or Hindi) and the recent conversation. You MUST reply with a single JSON object (no markdown, no code fences) matching this exact shape:

{
  "action": "navigate" | "create_project" | "create_invoice" | "create_client" | "start_timer" | "stop_timer" | "query" | "draft" | "clarify" | "none",
  "parameters": { ... },           // action-specific fields
  "response": "short spoken reply (1-2 sentences, friendly, in the SAME language as the user)",
  "needsMoreInfo": false           // true if you asked a follow-up question
}

Actions:
- navigate: parameters.route is one of "/dashboard","/projects","/time-tracker","/contracts","/invoices","/messages","/analytics","/assistant","/settings"
- create_project: parameters { title, client_name?, deadline? (ISO date), budget? (number), currency? }. Ask for missing title; other fields optional.
- create_invoice / create_client / start_timer / stop_timer: parameters as relevant; if not enough info, use "clarify".
- query: a question about the user's data — set response to your best concise answer based on context if any, otherwise say you'll check.
- draft: parameters.kind ("contract" | "email" | "price_suggestion"), parameters.brief — response should contain the draft text.
- clarify: ask one short follow-up; set needsMoreInfo true.
- none: chit-chat or unclear — just respond conversationally.

Rules:
- Detect "next Friday", "tomorrow", etc. and resolve relative to TODAY=${new Date().toISOString().slice(0, 10)}.
- Convert money words ("50000", "fifty thousand", "₹50,000") to a plain number.
- Reply in Hindi (Devanagari) if the user spoke Hindi; otherwise English.
- Keep "response" under 200 chars. Be warm, concise, professional.
- ALWAYS return valid JSON. Nothing else.`;

export const Route = createFileRoute("/api/voice-command")({
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
          const transcript: string = String(body?.transcript ?? "").slice(0, 2000);
          const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body?.history)
            ? body.history.slice(-8)
            : [];
          if (!transcript.trim()) {
            return new Response(JSON.stringify({ error: "Empty transcript" }), { status: 400 });
          }

          // Lightweight context — recent projects + overdue invoices for "query" actions
          const [{ data: projects }, { data: invoices }] = await Promise.all([
            supabase.from("projects").select("id,title,client_name,status,deadline,rate_amount,currency").order("created_at", { ascending: false }).limit(20),
            supabase.from("invoices").select("id,number,client_name,total,status,due_date").order("created_at", { ascending: false }).limit(20),
          ]);
          const context = `Recent projects: ${JSON.stringify(projects ?? [])}\nRecent invoices: ${JSON.stringify(invoices ?? [])}`;

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500 });
          }

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "system", content: `User data context:\n${context}` },
                ...history,
                { role: "user", content: transcript },
              ],
            }),
          });

          if (!resp.ok) {
            if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429 });
            if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402 });
            const t = await resp.text();
            console.error("voice-command gateway error", resp.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
          }

          const data = await resp.json();
          const raw = data?.choices?.[0]?.message?.content ?? "{}";
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { action: "none", parameters: {}, response: String(raw).slice(0, 200), needsMoreInfo: false };
          }
          return new Response(JSON.stringify(parsed), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("voice-command error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500 });
        }
      },
    },
  },
});
