# Zelvra Desktop Monitoring Agent — Spec (v0.1)

Status: **proposed**. Not yet implemented.

The browser-based tracker shipped in Phase 11 covers in-tab activity, IP
logging, productivity scoring, tamper-proof hashing, screen-share screenshots,
and disputes. The features below require **OS-level access** that no browser
permission can grant; they need a small native companion (Electron, Tauri, or
Wails) running on the freelancer's machine.

## Scope of the agent

The agent is a tray app. It pairs once with a Zelvra account via OAuth-style
device code, then runs in the background and pushes data to the same
server functions used by the web tracker.

### Features the agent adds

| # | Capability | Web limitation | Agent approach |
|---|---|---|---|
| 1 | Global keystroke count | Browser only sees its own tab | `iohook` / Tauri global shortcuts API → counter only, never key content |
| 2 | Silent random screenshots | Screen Capture API requires manual share prompt every time | Native screen capture (`screenshot-desktop`, Tauri `screenshot`) |
| 3 | Active window / app detection | None | `active-win` (cross-platform) → app name, window title |
| 4 | App allowlist ("work apps") | n/a | Local config; per-project allowlist; flags time in non-work apps |
| 5 | Concurrent-device detection | Web can flag IP changes only | Agent heartbeat includes a stable device ID (machine UUID hashed) |
| 6 | Offline buffering | Browser tabs can die | Agent queues samples locally (SQLite) and replays on reconnect, capped at 5 min retroactive |
| 7 | OS idle detection | Web only sees tab focus | `powerMonitor.getSystemIdleTime()` (Electron) |

## Pairing flow

1. User opens **Settings → Desktop Agent** in the web app, clicks **Pair**.
2. Server issues a short-lived device code (`tracker_device_codes` table).
3. Agent prompts user to paste the code, calls `pairDevice({ code })`.
4. Server returns a long-lived agent token bound to a `device_id`.
5. Agent stores token in OS keychain (`keytar`).

## Server contract (re-uses existing server fns)

The agent calls the same endpoints already shipped:

- `startSession` — agent supplies `deviceFingerprint`
- `heartbeat` — agent supplies real keystroke counts, plus a new optional
  `appUsage` field: `{ [appName: string]: secondsActive }`
- Screenshot upload — direct PUT to `session-screenshots` storage bucket
  using a signed URL minted by a new server fn `signScreenshotUpload`

To support app usage we add one column:

```sql
ALTER TABLE public.activity_samples ADD COLUMN app_usage jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.tracked_sessions ADD COLUMN device_id text;
```

Aggregations (top apps per session, "non-work app" % flagged) are computed
server-side in a new view `session_app_breakdown`.

## Privacy / consent

- Agent shows the same monitoring notice as the web flow on first run.
- Local **pause** button immediately stops capture and posts a `paused` event.
- Per-app blocklist (e.g. always blur banking apps) stored locally.
- Screenshots are encrypted at rest in the local outbox until upload succeeds.
- Same 90-day retention applies once uploaded.

## Tech choices

- **Tauri (Rust)** preferred over Electron: ~6 MB installer, no Chromium, no
  Node runtime exposed to user, native screen capture is solid on macOS/Win/Linux.
- Single binary per platform, signed + notarized for macOS.
- Auto-update via Tauri's built-in updater pulling from `releases.zelvra.app`.

## Not included (out of scope for v1)

- Browser tab tracking inside Chrome/Firefox (would need separate extension)
- Mobile capture (iOS forbids background screen capture entirely)
- Email/Slack content analysis

## Open questions

1. Should the agent be **required** for paid client plans, or optional?
2. Default to capturing every 10 min, or let client set cadence per project?
3. Do we want a "client-side agent" too (read-only viewer with push notifications)?
