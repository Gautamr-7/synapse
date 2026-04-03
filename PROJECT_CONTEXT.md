# PROJECT_CONTEXT.md
# Synapse AI — Complete Continuation Document

---

## 1. Project Overview

**Synapse AI** is persistent memory infrastructure for AI agents — "the Firebase for AI agent state."

Today's AI agents are stateless. Every restart, crash, or model switch wipes their memory completely. Developers building agents have to write custom memory logic for every project. Workflows break. Data gets re-processed. Tokens get wasted.

Synapse fixes this with one API call. Any AI agent on any framework can plug into Synapse and immediately get:
- Persistent execution memory that survives restarts
- Workflow step tracking with resume-after-crash
- Context compression for LLM injection
- Multi-agent session isolation
- A live developer dashboard

**One-line pitch:** *Synapse AI is to AI agents what Firebase is to apps — the memory infrastructure layer you never have to build yourself.*

**Market validation:** Mem0 raised $24M, Supermemory backed by Jeff Dean (Google AI chief), multiple YC-backed competitors. The gap Synapse owns is **execution memory** — tracking *what agents did*, not just what was said. Nobody else owns this cleanly.

**Target customers:**
1. Indie developers building AI agents (LangChain, CrewAI, AutoGen users)
2. AI startups shipping agent-powered products
3. Enterprises running AI automation (invoice processing, customer support, data pipelines)

**Business model:**
- Free: 10,000 memory ops/month, 3 sessions, 7-day history
- Pro: $49/month — unlimited sessions, 100k ops, 90-day history
- Enterprise: Custom — private deployment, SOC2, SLAs

---

## 2. System Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, D3.js |
| Backend | FastAPI (Python), Uvicorn |
| Database | SQLite (local dev) + Supabase PostgreSQL (production) |
| ORM/DB layer | SQLAlchemy 2.0 + psycopg2-binary |
| AI Agent | Groq API (`llama-3.1-8b-instant`) |
| Email | Resend API |
| SDK | Python package on PyPI (`pip install synapseai-sdk`) |
| Frontend hosting | Netlify |
| Backend hosting | Render (free tier) |
| Database hosting | Supabase (free tier, PostgreSQL) |

**Live URLs:**
- Landing page: `https://synapse-aii.netlify.app`
- Dashboard: `https://synapse-aii.netlify.app/dashboard`
- Backend API: `https://synapse-backend-b5k1.onrender.com`
- API Docs: `https://synapse-backend-b5k1.onrender.com/docs`
- PyPI: `https://pypi.org/project/synapseai-sdk`
- GitHub: `https://github.com/Gautamr-7/synapse`

---

## 3. Repository Structure

```
synapse-ai/
├── backend/
│   ├── main.py              # FastAPI app — all API endpoints
│   ├── database.py          # DB layer — supports SQLite (local) + PostgreSQL (prod)
│   ├── agent.py             # Universal Groq-powered AI agent
│   ├── signup.py            # Developer signup + Resend email
│   ├── visual_memory.py     # Screenshot capture (local only, not on Render)
│   ├── demo_test.py         # Manual demo script for restart/resume
│   ├── requirements.txt     # Python dependencies
│   ├── runtime.txt          # python-3.11.0 (for Render)
│   ├── .env                 # Local env vars (not committed)
│   └── synapse.db           # SQLite DB (local only, not committed)
│
├── dashboard/
│   ├── src/app/
│   │   ├── page.tsx                    # Landing page (Lensboard-style, mesh gradient)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles
│   │   └── dashboard/
│   │       ├── page.tsx                # Main dashboard (5 tabs)
│   │       ├── MemoryGraph.tsx         # D3 force-simulation memory graph
│   │       └── ActionReplay.tsx        # Screenshot viewer tab
│   ├── netlify.toml                    # Netlify build config
│   ├── package.json
│   └── next.config.ts
│
└── sdk/
    ├── synapse.py           # The SDK — Synapse class
    ├── setup.py             # PyPI package config (name: synapseai-sdk)
    ├── README.md            # SDK documentation
    └── example.py           # Usage example
```

---

## 4. Backend Details

### Environment Variables (Render + local .env)
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
GROQ_API_KEY=gsk_xxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### All API Endpoints

**Sessions**
- `POST /session/create` — creates session, returns `session_id` (format: `syn-xxxxxxxx`)
- `GET /session/{session_id}` — get session details and progress %

**Memory**
- `POST /memory/save` — save key-value to session memory
- `GET /memory/session/{session_id}` — get all memory entries
- `DELETE /memory/session/{session_id}` — clear session

**Workflow**
- `POST /workflow/update` — track a step (status: pending/running/completed/failed)
- `GET /workflow/session/{session_id}` — get all steps + statuses
- `GET /workflow/resume/{session_id}` — **THE CORE FEATURE** — returns next pending step after restart

**Context**
- `GET /context/build/{session_id}` — returns compressed LLM context string

**Predictive Memory** *(added, needs testing)*
- `GET /memory/predict/{session_id}` — predicts next step based on historical patterns, returns confidence score

**Agents**
- `GET /agents/active` — all registered agents with progress

**Developer**
- `POST /developer/keys` — generate API key
- `GET /developer/keys/{key}/stats` — usage stats
- `GET /developer/playground/sessions` — all sessions

**Signup**
- `POST /signup` — `{name, email, project}` → generates API key, sends email via Resend, returns key

**Health**
- `GET /` — API info
- `GET /health` — alive check

### API Key Auth
All endpoints accept optional `X-API-Key` header. If missing or `"demo"`, uses demo namespace. If present, validates against `api_keys` table and increments usage count.

### Agent Architecture (`agent.py`)

The agent is a universal task executor:
1. Takes any text task as input
2. Auto-detects agent type (research/automation/analysis/planning/coding/marketing)
3. Calls Groq to plan steps (returns JSON array of snake_case step names)
4. Registers all steps as `pending` in Synapse
5. Executes each step — calls Groq to describe what it did
6. Saves result + marks step `completed` in Synapse
7. Captures screenshot via `POST /visual/capture` (local only)
8. Crashes after step N-2, leaving last 2 pending
9. `--resume` flag: calls `/workflow/resume`, gets context, finishes remaining steps

**Usage:**
```bash
python agent.py "any task description"
python agent.py --resume                    # resumes last session
python agent.py --resume <session_id>       # resumes specific session
```

**Key config in agent.py:**
```python
GROQ_API_KEY = "gsk_xxx"  # must be set manually
SYNAPSE_BASE  = "https://synapse-backend-b5k1.onrender.com"
MODEL         = "llama-3.1-8b-instant"
```

### Database Schema (PostgreSQL/SQLite)

**memories**
```sql
id, session_id, api_key, key, value, memory_type, created_at, updated_at
UNIQUE(session_id, key)
```

**workflow_steps**
```sql
id, session_id, api_key, step_name, status, metadata, created_at, updated_at
UNIQUE(session_id, step_name)
```

**agents**
```sql
id, session_id, api_key, name, agent_type, task, status, created_at, updated_at
UNIQUE(session_id)
```

**api_keys**
```sql
id, api_key, name, email, usage_count, created_at
UNIQUE(api_key)
```

**visual_memory** *(local SQLite only — not on Render)*
```sql
id, session_id, step_name, screenshot_b64, action_taken, outcome, captured_at
```

### Database Layer (`database.py`)
Auto-detects environment:
- If `DATABASE_URL` env var is set → uses PostgreSQL via SQLAlchemy
- If not set → uses SQLite (`synapse.db` file)

Uses `ON CONFLICT DO UPDATE` (upsert) for PostgreSQL, manual check for SQLite.

### Signup Flow (`signup.py`)
Uses Resend API to email a beautifully formatted HTML email containing:
- The generated API key
- Quick-start code snippet
- Links to dashboard and docs
- Sender: `onboarding@resend.dev`

### Predictive Memory (`database.py` additions)
Two functions added at bottom of `database.py`:
- `get_step_patterns(step_name, limit=10)` — gets historical completed runs of a step
- `get_session_step_sequence(session_id)` — gets ordered completed steps for pattern analysis

Endpoint `GET /memory/predict/{session_id}` in `main.py`:
- Finds next pending step
- Looks up historical outcomes for that step
- Returns confidence score (capped at 95%), most likely outcome, pre-built context

---

## 5. Frontend Details

### Landing Page (`src/app/page.tsx`)

**Design:** Lensboard/Clarity-style — elegant, editorial, not generic AI aesthetic
- **Background:** Animated canvas with cyan-slate mesh gradient, mouse-reactive bright bloom from upper-right, animated isometric tile grid, lower-left shadow vignette
- **Typography:** Playfair Display (serif headings), DM Sans (body), DM Mono (code)
- **Animations:** Word-by-word scroll reveals, hero fade-up on load, glass tile cards
- **Color:** Cyan-teal background, dark navy ink text (`rgba(6,18,28,0.92)`), frosted glass tiles (`rgba(255,255,255,0.28)`)

**Sections:**
1. Nav — logo, links, "Get started →" button
2. Hero — large Playfair Display headline, subtext, CTA buttons, code preview tile
3. Problem — "Every AI agent / has amnesia" with 4 pain points in glass tile
4. Features — 6 numbered glass cards (01-06) with word-reveal on scroll
5. Integration — code block + 3-step process + market validation
6. Signup — form (name, email, project) → calls `POST /signup` → shows API key
7. Footer

**Working signup flow:**
- Fills form → hits `POST /signup` on Render → generates key, emails it via Resend → displays key on screen with copy button

### Dashboard (`src/app/dashboard/page.tsx`)

**Design:** Dark theme — `#050508` background, orange/red accents (`#e85d04`), DM Sans + DM Mono + Bebas Neue fonts

**5 Tabs:**
1. **Playground** — Session ID input, 4 stat cards (steps/completed/pending/memory), live workflow steps with status badges, compressed context panel, session memory viewer. Auto-refreshes every 2 seconds.
2. **Sessions** — All agent sessions grid with progress bars, session history list. Click any to inspect in Playground.
3. **Memory Graph** — D3 force-simulation graph. Goal node (violet center) → step nodes (green=completed, amber=running, gray=pending) → result leaves → memory key nodes. Scroll to zoom, drag nodes, click to inspect. Updates every 2.5s.
4. **Action Replay** — Left: step timeline. Right: full screenshot of screen at that step moment. Shows what agent literally saw.
5. **API Keys** — Generate key by project name, copy button, full endpoint reference table.

**API base:** All dashboard files now use `https://synapse-backend-b5k1.onrender.com` (localhost replaced globally).

### Memory Graph (`src/app/dashboard/MemoryGraph.tsx`)
- Uses D3 force simulation
- Builds graph from `/workflow/session/{id}` + `/memory/session/{id}`
- Node types: goal (violet), step (color by status), result (teal), memory (blue)
- TypeScript fix applied: `(svg as any).call(zoom)` and `(node as any).call(drag)` to bypass D3 type conflicts

### Action Replay (`src/app/dashboard/ActionReplay.tsx`)
- Fetches `/visual/history/{session_id}` for step list
- On click: fetches `/visual/replay/{entry_id}` for full base64 screenshot
- Renders `<img src="data:image/jpeg;base64,...">`
- Note: Only works when agent runs locally (screenshots not captured on Render)

---

## 6. SDK Details

**Package name:** `synapseai-sdk`
**Install:** `pip install synapseai-sdk`
**PyPI:** `https://pypi.org/project/synapseai-sdk`
**File:** `sdk/synapse.py`

### Synapse Class

```python
from synapse import Synapse

syn = Synapse(
    api_key="syn-your-key",
    base_url="https://synapse-backend-b5k1.onrender.com"  # default
)
```

### Methods

| Method | Endpoint called | Description |
|--------|----------------|-------------|
| `syn.create_session(task, agent_name, agent_type)` | `POST /session/create` | Create session, returns session_id |
| `syn.get_session(session_id)` | `GET /session/{id}` | Get session details |
| `syn.save(session_id, key, value, memory_type)` | `POST /memory/save` | Save memory entry |
| `syn.get_memory(session_id)` | `GET /memory/session/{id}` | Get all memory |
| `syn.clear(session_id)` | `DELETE /memory/session/{id}` | Clear session |
| `syn.update_step(session_id, step_name, status, metadata)` | `POST /workflow/update` | Track step |
| `syn.get_workflow(session_id)` | `GET /workflow/session/{id}` | Get workflow state |
| `syn.resume(session_id)` | `GET /workflow/resume/{id}` | Resume after restart |
| `syn.context(session_id)` | `GET /context/build/{id}` | Get compressed context |
| `syn.health()` | `GET /health` | Check API status |
| `syn.run_step(session_id, step_name, fn, *args)` | Multiple | Auto-tracked step wrapper |

### run_step convenience wrapper
```python
# Automatically marks step running → completed (or failed)
result = syn.run_step(session, "fetch_emails", my_function, arg1, arg2)
```

---

## 7. Important Design Decisions

1. **SQLite + PostgreSQL dual support** — Same codebase works locally with SQLite and in production with Supabase. Switched by presence of `DATABASE_URL` env var. Uses upsert (ON CONFLICT) for idempotent saves.

2. **Supabase Session Pooler** — Must use Session Pooler URL (port 5432, `pooler.supabase.com`) not direct connection. Render uses IPv4, Supabase free tier direct connection is IPv6 only.

3. **API key = "demo" allowed** — `verify_api_key()` passes through `None` or `"demo"` without database lookup. Allows unauthenticated demo usage.

4. **Visual memory local-only** — PyAutoGUI captures the actual screen, so it only makes sense locally. The `visual_memory.py` module and its endpoints are removed from `main.py` for the Render deployment to avoid import errors. Visual capture only works when running agent locally.

5. **TypeScript as any for D3** — D3's zoom and drag typings conflict with React's `useRef<SVGSVGElement>` (which can be null). Fixed with `(svg as any).call()` and `(node as any).call()`.

6. **Next.js static export for Netlify** — `next.config.ts` uses `output: "export"` and `trailingSlash: true`. Netlify publish directory is `out`. The `@netlify/plugin-nextjs` was removed as it caused timeout issues.

7. **SDK name `synapseai-sdk`** — `synapse-sdk` was already taken on PyPI.

8. **Render free tier sleep** — Backend sleeps after 15 min of inactivity. Wake it up by opening the URL 5 minutes before demo.

9. **Agent crash simulation** — Agent intentionally stops after `len(steps) - 2` steps to demonstrate restart/resume for demo purposes.

10. **Session ID format** — `syn-{secrets.token_hex(6)}` (12 hex chars). Example: `syn-b69f80382fbd`.

---

## 8. Environment Setup

### Backend

```bash
cd synapse-ai/backend
pip install -r requirements.txt
python -m uvicorn main:app --reload  # local dev
```

**requirements.txt:**
```
fastapi>=0.111.0
uvicorn>=0.29.0
pydantic>=2.10.0
python-dotenv>=1.0.0
groq>=1.0.0
requests>=2.31.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
resend>=0.7.0
```

**runtime.txt:** `python-3.11.0`

**Local .env:**
```
GROQ_API_KEY=gsk_xxxxxxxxxxxx
DATABASE_URL=postgresql://postgres.gxxvbdtlegfxuwxovion:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Frontend (Dashboard)

```bash
cd synapse-ai/dashboard
npm install
npm run dev        # local: localhost:3000
npm run build      # production build
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "out"
```

**next.config.ts:**
```typescript
const nextConfig = {
  output: "export",
  trailingSlash: true,
};
```

### SDK

```bash
cd synapse-ai/sdk
pip install -r requirements.txt  # just: requests>=2.31.0
python example.py  # test it
```

**To publish new version to PyPI:**
```bash
# bump version in setup.py first
python -m build
python -m twine upload dist/*
# username: __token__
# password: pypi- token
```

### Render Deploy Settings
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port 10000`
- Environment Variables: `DATABASE_URL`, `GROQ_API_KEY`, `RESEND_API_KEY`

### Netlify Deploy Settings
- Base directory: `dashboard`
- Build command: `npm run build`
- Publish directory: `out`

---

## 9. Current Working State

### Fully Implemented ✅

- **Memory API** — save, retrieve, clear, upsert — works on Supabase
- **Workflow tracking** — step status (pending/running/completed/failed)
- **Restart & Resume** — `GET /workflow/resume/{id}` returns exact next step
- **Context compression** — structured LLM prompt from session state
- **Universal AI agent** — any task, auto-detected type, Groq-powered
- **Multi-agent sessions** — each session isolated by session_id + api_key
- **Developer API keys** — generate, validate, track usage
- **Live dashboard** — 5 tabs, auto-refresh 2s, production URL
- **Memory graph** — D3 force simulation, live updates
- **Action Replay tab** — screenshot viewer (works locally only)
- **Python SDK** — published on PyPI as `synapseai-sdk 0.1.0`
- **Developer signup** — form → key generation → Resend email
- **Landing page** — Lensboard-style, mesh gradient, word animations
- **Cloud deployment** — Render + Netlify + Supabase all live
- **GitHub repo** — `https://github.com/Gautamr-7/synapse`

### Partially Implemented ⚠️

- **Predictive memory** — endpoint code written, added to `main.py` and `database.py`, but not yet pushed/tested in production
- **Signup backend** — `signup.py` written and `/signup` endpoint added to `main.py`, but may not be pushed to Render yet — verify by hitting `POST /signup` on the live URL
- **Visual memory on Render** — removed from production (only works locally)
- **Dashboard showing live data** — `localhost:8000` was replaced with production URL, but needs to be verified that Netlify picked up the change

---

## 10. Next Tasks

**Immediate (verify these work):**
1. Confirm `POST /signup` works on `synapse-backend-b5k1.onrender.com/docs`
2. Confirm dashboard at `synapse-aii.netlify.app/dashboard` shows live data from Supabase
3. Test predictive memory: run same task twice, call `GET /memory/predict/{id}` on second run

**Next features to build:**
4. **Token comparison endpoint** — `GET /compare/{session_id}` — shows buffer memory tokens vs Synapse compressed tokens, savings %, cost savings. Proves empirical value over normal memory.
5. **Comparison tab on dashboard** — visual display of token savings per session. Investor-facing proof.
6. **Browser agent with Playwright** — agent that actually browses websites, fills forms. Makes visual memory genuinely powerful. `pip install playwright` + `playwright install chromium`.
7. **Predictive memory badge on dashboard** — show "Synapse predicted this" on pre-loaded steps in the Playground tab.
8. **Agent Immune System** — before each step, check failure history, inject warning into context if step has failed before.
9. **Cross-model context portability** — `POST /context/export` and `POST /context/import` — portable session snapshot.
10. **Agent collaboration memory** — two agents sharing one session, demonstrated live.
11. **Landing page signup verification** — test the full flow: fill form → key generated → email received → key works.

**Polish:**
12. Add `NEXT_PUBLIC_API_URL` env var to Netlify so the URL isn't hardcoded in dashboard files
13. Add loading states to dashboard when Render is waking up (free tier sleep)
14. Improve Action Replay to work with a mock/demo mode when visual capture isn't available

---

## 11. Developer Notes

- **Groq model:** Always use `llama-3.1-8b-instant` — `llama3-8b-8192` is decommissioned
- **Render wakeup:** Free tier sleeps after 15 min. Always open the backend URL before a demo.
- **Supabase connection:** Use Session Pooler URL (port 5432, `pooler.supabase.com`), NOT direct connection (IPv6 only, breaks on Render)
- **PyPI token:** `__token__` as username, `pypi-xxxx` as password when uploading
- **GitHub user:** `Gautamr-7`, repo: `synapse`
- **agent.py needs manual key:** Every time a new `agent.py` is generated, must manually paste `GROQ_API_KEY` — it defaults to `"your_groq_api_key_here"`
- **Windows PowerShell:** Use `python -m uvicorn` not `uvicorn` directly (PATH issue)
- **D3 TypeScript:** Use `(svg as any).call()` and `(node as any).call()` to avoid null type errors
- **next.config.ts output export:** Required for Netlify static hosting. Means no server-side rendering — all API calls are client-side.
- **CORS:** Backend has `allow_origins=["*"]` — intentional for developer-facing API
- **Session data format:** All timestamps stored as ISO strings. PostgreSQL uses `::text` cast in queries.
- **Supabase project ID:** `gxxvbdtlegfxuwxovion`
- **The demo sequence for Foundry:**
  1. Open `synapse-aii.netlify.app` — landing page
  2. Click Dashboard
  3. Run `python agent.py "research top AI memory startups"`
  4. Watch steps appear live on dashboard
  5. Kill backend (Ctrl+C) — "it crashed"
  6. Restart backend
  7. Run `python agent.py --resume`
  8. Show Memory Graph tab — nodes animated
  9. "That is Synapse."
