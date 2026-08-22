# Interview Agent

AI-powered technical interview practice platform.

## Stack decisions

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind | SSR/SSG flexibility, great DX, easy Vercel deploy |
| Backend | Node.js + Express + TypeScript | Familiar ecosystem, easy Render deploy, same language as frontend |
| Database | MongoDB (Mongoose) | Flexible schema for interview Q&A, credits, history |
| Auth | JWT (RS256-style secret) stored in `localStorage` | Simple for MVP; swap to NextAuth/Clerk for social login later |
| LLM | OpenAI (configurable — swap `OPENAI_API_KEY` for `ANTHROPIC_API_KEY`) | Best function-calling support for structured question/feedback output |
| File storage | Not needed for MVP (no file uploads yet) | Add Cloudinary when resume parsing is added |

## Project structure

```
interview-agent/
├── client/                  # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── login/           # Login page
│   │   │   ├── register/        # Register page
│   │   │   └── dashboard/       # Interview dashboard
│   │   └── lib/
│   │       ├── api.ts           # Fetch wrapper with JWT
│   │       └── auth.ts          # Auth service
│   └── .env.local.example
│
└── server/                  # Express API
    ├── src/
    │   ├── index.ts             # Entry point, middleware, route mount
    │   ├── config/db.ts         # MongoDB connection
    │   ├── models/
    │   │   ├── User.ts          # users + credits
    │   │   └── Interview.ts     # interview sessions + Q&A history
    │   ├── routes/
    │   │   ├── health.ts        # GET /api/health
    │   │   ├── auth.ts          # register / login / me
    │   │   ├── interviews.ts    # CRUD interviews
    │   │   └── users.ts         # profile / credits
    │   └── middleware/
    │       ├── auth.ts          # JWT protect + adminOnly
    │       └── errorHandler.ts  # global 404 + error handler
    └── .env.example
```

## Getting started

### 1. Clone & install

```bash
# Server
cd server
npm install
cp .env.example .env      # fill in MONGODB_URI and JWT_SECRET

# Client
cd ../client
npm install
cp .env.local.example .env.local
```

### 2. Run locally

```bash
# Terminal 1 — API server (port 5000)
cd server
npm run dev

# Terminal 2 — Next.js dev server (port 3000)
cd client
npm run dev
```

### 3. Health check

```
GET http://localhost:5000/api/health
```

Returns database status, uptime, and environment.

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Server & DB health |
| POST | `/api/auth/register` | — | Create account (5 free credits) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/interviews` | JWT | List user's interviews |
| POST | `/api/interviews` | JWT | Start new interview (costs 1 credit) |
| GET | `/api/interviews/:id` | JWT | Get interview detail |
| DELETE | `/api/interviews/:id` | JWT | Delete interview |
| GET | `/api/users/credits` | JWT | Get credit balance |
| PATCH | `/api/users/profile` | JWT | Update name |

## Deployment (Render)

1. Push this repo to GitHub.
2. **Backend:** New Web Service → connect repo → root `server/` → build `npm install && npm run build` → start `npm start`.
3. **Frontend:** New Web Service (or Static Site for pure static) → root `client/` → build `npm run build` → start `npm start`.
4. Set all env vars from `.env.example` in Render's dashboard.
