# Project Context

## Tix4SMB — Ticket Tracking & Vendor Management for Small Businesses

Built for Aragrow — optimized for small-business field service automations.

---

## Tech Stack

**Backend** (`backend/`)
- Node.js + Express + TypeScript
- MongoDB Atlas + Mongoose (ODM)
- Google OAuth 2.0 + Passport.js + JWT (HttpOnly cookies)
- Zod (request validation), Helmet (security headers), express-rate-limit
- Multi-provider LLM: Anthropic Claude, OpenAI, Google Gemini

**Frontend** (`frontend/`)
- React 19 + TypeScript + Vite
- TailwindCSS + shadcn/ui (Radix primitives)
- TanStack Query (server state), React Router v7, Axios

**Integrations**
- Jobber: GraphQL API (clients, properties, visits, jobs, vendors)
- GoHighLevel (GHL): REST API (contacts, conversations, messaging)

**Scraper** (`scraper.py`)
- Python + Playwright (headless Chromium)
- Standalone tool — not part of the main app process
- Run with: `python3 scraper.py config.json`

---

## Project Rules

- **No inline styles** — use Tailwind classes; avoid `style={{...}}` in JSX
- **Async everywhere** — all external API calls (Jobber, GHL, LLM) must be async/await
- **Validate at boundaries** — use Zod on all incoming request bodies; trust internal types
- **JWT is HttpOnly cookie** — never expose the token in JS; use `withCredentials: true` on Axios
- **CSRF awareness** — POST/PUT/DELETE routes require valid session/cookie auth; no open mutations
- **Mock mode** — GHL and Jobber both have mock data modes toggled via localStorage; respect `isMockGHLEnabled()` and `isMockJobberEnabled()` in pickers and service calls
- **LLM provider agnostic** — always route through `runAgentLoop` / `callLLM` in `llmClient.ts`; never call Anthropic/OpenAI/Gemini SDKs directly from route handlers

---

## Key Directories

```
backend/src/
  index.ts          — Express app bootstrap
  routes/           — Express routers (tickets, settings, ghl, jobber, auth)
  services/         — Business logic (llmClient, aiConfig, rfpService, ticketAgent)
  models/           — Mongoose schemas (Ticket, TicketTask, Note, User)
  lib/              — Shared utilities (mockGHLData, mockJobberData)

frontend/src/
  pages/            — Route-level components (Dashboard, Tickets, Settings)
  components/       — Shared UI (TaskList, GHLEntityPicker, NoteList, …)
  hooks/            — Custom hooks (useMockGHL, useMockJobber, …)
  lib/              — Axios instance, query client, utils
```

---

## Your Role

Help optimize, extend, and maintain Aragrow's small-business automation platform. Prioritize:
1. Correctness and security over cleverness
2. Consistent patterns — match the existing code style before introducing new abstractions
3. Minimal changes — only touch what's needed; don't refactor unrelated code
4. Working features — when in doubt, ship the simple version first
