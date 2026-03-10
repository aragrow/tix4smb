# TIX4SMB — Project Overview

AI-powered ticket management platform built for cleaning service businesses.
Developed by **Aragrow, LLC**.

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React** + **TypeScript** | UI framework (via Vite) |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library |
| **React Router** | Client-side navigation |
| **TanStack Query** (react-query) | Data fetching & caching |
| **Axios** | HTTP client |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** + **Express** + **TypeScript** | API server |
| **MongoDB** + **Mongoose** | Database & ODM |
| **Passport.js** + **Google OAuth 2.0** | Authentication |
| **JWT** (HttpOnly cookies) | Session management |
| **Zod** | Schema validation |
| **Helmet** | Security headers |
| **express-rate-limit** | Rate limiting |

### Integrations
| Integration | Purpose |
|---|---|
| **Jobber API** (GraphQL) | Clients, jobs, visits, properties, vendors |
| **GoHighLevel API** | Contacts, opportunities, appointments |
| **Anthropic Claude** | AI ticket analysis agent |
| **OpenAI** | AI ticket analysis agent (alternate provider) |
| **Google Gemini** | AI ticket analysis agent (alternate provider) |

### Infrastructure / Dev
| Tool | Purpose |
|---|---|
| **Git / GitHub** | Version control |
| **TypeScript** (`tsc`) | Compiled on both frontend and backend |

---

## Project Structure

```
tix4smb/
├── backend/
│   └── src/
│       ├── config/         # Env validation (Zod)
│       ├── middleware/     # Auth, rate limiter
│       ├── models/         # Mongoose models (Ticket, Note, Task, User, Counter)
│       ├── routes/         # Express routers (tickets, jobber, ghl, auth, settings)
│       ├── services/       # AI agent, LLM client, Jobber client, GHL client
│       └── lib/            # Mock data for dev
└── frontend/
    └── src/
        ├── api/            # Axios client
        ├── components/     # Shared UI components
        ├── hooks/          # Custom React hooks
        ├── pages/          # Route-level page components
        └── types/          # Shared TypeScript interfaces
```

---

## Key Features

- **Ticket management** — create, assign, prioritize, and close support tickets
- **AI agent** — analyzes ticket descriptions and generates tasks/notes automatically
- **Jobber integration** — link tickets to clients, jobs, visits, properties, and vendors
- **GoHighLevel integration** — link tickets to contacts, opportunities, and appointments
- **Task management** — per-ticket task list with bulk RFP and notification actions
- **Note thread** — chronological notes with AI-generated note badges
- **Google OAuth** — sign in with Google; access granted on first login

---

## Security Highlights

- All secrets loaded from environment variables (validated at startup via Zod)
- JWT stored in HttpOnly, SameSite=lax cookies (not localStorage)
- All `/api/*` routes protected by `authenticate` middleware
- Helmet security headers applied globally
- CORS locked to `FRONTEND_URL` env variable
- Rate limiting: 100 req/15 min (global), 10 req/15 min (auth)
- `.env.local` files gitignored on both frontend and backend
