# Zelvra — Phased Build Plan

"Freelance without fear." — operating system for freelancers. Real stack: **TanStack Start + Lovable Cloud (Supabase) + Tailwind + shadcn + Framer Motion + TanStack Query**.

## Phases (ship one per turn, in order)

**Phase 1 — Landing + Design System (this turn)**
- Purple-forward dark-default design tokens in `src/styles.css` (primary `#7F77DD` → oklch)
- Marketing site: hero with tagline, animated stats, problem, features grid, how-it-works (3 steps), pricing (Free/Pro/Agency), testimonials, FAQ, CTA, footer
- Framer Motion animations, fully responsive, SEO meta + sitemap/robots
- Routes: `/` only. Login/Signup buttons route to `/login` (built Phase 2)

**Phase 2 — Auth + Dashboard shell**
- Enable Lovable Cloud, email+password + Google OAuth (via Lovable broker)
- `profiles` table + trigger, `user_roles` table + `has_role()`
- Category onboarding (Designer / Video / Dev / Writer / Music)
- Profile page (avatar upload via Storage, hourly rate, bio, links)
- Protected `_authenticated` layout, sidebar + topbar, empty dashboard with stat cards

**Phase 3 — Projects core**
- `projects`, `scope_items`, `time_entries`, `templates` tables + RLS + GRANTs
- Create/edit/delete/duplicate projects, status pipeline, priority, tags, deadline countdown
- List + Grid + Kanban views, search/filter/sort, bulk actions
- Project detail page with tabs

**Phase 4 — Client portal + Contracts + Files**
- Tokenized public project link (no login)
- `contracts`, `contract_appendices`, `files` tables, Supabase Storage private bucket
- Contract builder with e-signature (canvas), PDF export
- File upload with dynamic watermarked preview, right-click/devtools guards, payment-gated download

**Phase 5 — Invoices + Payments + Escrow**
- `invoices`, `invoice_reminders`, `payments` tables
- Invoice generator (multi-currency, GST/VAT), PDF, email send
- Stripe seamless payments (via Lovable Payments) for escrow + invoice payment
- Reminder cron via `/api/public/cron/*`

**Phase 6 — Realtime messaging + notifications**
- `messages`, `notifications` tables with Supabase Realtime
- In-app chat per project, typing indicators, read receipts, attachments
- Notification bell + toasts, preferences, email via Resend

**Phase 7 — AI assistant (freelancer + client)**
- `ai_chat_history` table
- Lovable AI Gateway (Gemini default; no key needed) for contract drafting, price suggestion, follow-up emails, scope-creep detection, conversation summaries
- Floating chat with quick-action chips, project context injection

**Phase 8 — Scope creep engine + auto-estimate**
- `scope_changes`, `scope_credits` tables
- AI compares messages/requests against `scope_items`, flags out-of-scope, tracks credits, suggests add-on price, one-click appendix + invoice

**Phase 9 — Analytics**
- Earnings (day/week/month/year), Recharts bar+line
- Scope-creep "money saved" report, top clients, completion rate, forecast
- Export CSV

**Phase 10 — Video calls**
- `video_calls`, `call_recordings` tables
- WebRTC peer-to-peer with Supabase Realtime for signaling (no Socket.io — not supported in this runtime)
- Screen share, in-call chat, AI meeting notes from transcript

**Phase 11 — PWA + polish**
- Manifest + icons (installable, no service worker by default per platform guidance)
- Biometric login (WebAuthn), mobile bottom nav, swipe gestures
- Settings (brand, notifications, billing, data export, delete account)
- Keyboard shortcuts, a11y pass, error boundaries everywhere

## Things that change from your spec
- **No React Router / Zustand / Socket.io** — TanStack Router + TanStack Query (already in template); Supabase Realtime replaces Socket.io. Local UI state stays in React; if a Zustand-style global store becomes necessary later I'll add it.
- **No PWA service worker** by default — installable via manifest only (avoids preview-iframe cache bugs). Tell me if you want a full SW.
- **Claude → Lovable AI Gateway** (Gemini family, no API key needed). I can swap to Anthropic later if you add a key.
- **Razorpay** isn't a built-in Lovable payments provider — Phase 5 uses Stripe seamless (works globally incl. India). Razorpay possible via BYO key later.
- **Resend, Anthropic, Razorpay** keys requested only when their phase lands.

## Phase 1 deliverable (this turn)
A complete, animated, dark-mode-default marketing site at `/` with the Zelvra brand, design tokens locked in, sitemap.xml + robots.txt, SEO meta. Login/Signup CTAs are wired to `/login` (404 until Phase 2 — expected).

Approve and I'll ship Phase 1 immediately.