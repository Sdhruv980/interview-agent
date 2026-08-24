# Interview Agent — MERN Stack

AI-powered technical interview practice platform built with the MERN stack.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + React Router v6 + Tailwind CSS |
| Backend | Node.js + Express (CommonJS) |
| Database | MongoDB via Mongoose |
| Auth | JWT stored in `localStorage` |
| LLM | OpenAI API (configurable — swap key for Anthropic) |

## Project structure

```
interview-agent/
├── client/                        # React (Vite) SPA
│   ├── src/
│   │   ├── main.jsx               # Entry — mounts <App> inside BrowserRouter
│   │   ├── App.jsx                # Route definitions
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state (user, login, logout)
│   │   ├── lib/
│   │   │   └── api.js             # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx   # Redirects unauthenticated users
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx      # Interview history list
│   │       ├── NewInterview.jsx   # Start a session (costs 1 credit)
│   │       ├── InterviewSession.jsx
│   │       └── NotFound.jsx
│   ├── .env.example
│   └── vite.config.js             # Proxies /api → localhost:5000 in dev
│
└── server/                        # Express REST API
    ├── src/
    │   ├── index.js               # Entry point
    │   ├── config/db.js           # Mongoose connection
    │   ├── models/
    │   │   ├── User.js            # users, hashed passwords, credits
    │   │   └── Interview.js       # sessions, Q&A, scores
    │   ├── routes/
    │   │   ├── health.js          # GET /api/health
    │   │   ├── auth.js            # register / login / me
    │   │   ├── interviews.js      # CRUD + PATCH for answers
    │   │   └── users.js           # credits / profile
    │   └── middleware/
    │       ├── auth.js            # protect + adminOnly
    │       └── errorHandler.js    # global 404 + error
    └── .env.example
```

## Getting started

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Fill in: MONGODB_URI, JWT_SECRET

# Client
cp client/.env.example client/.env
```

### 3. Run locally (two terminals)

```bash
# Terminal 1 — API (port 5000)
cd server && npm run dev

# Terminal 2 — React dev server (port 3000)
cd client && npm run dev
```

Vite proxies `/api/*` to `localhost:5000` automatically — no CORS issues in dev.

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Server + DB status |
| POST | `/api/auth/register` | — | Create account (5 free credits) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/interviews` | JWT | List user's interviews |
| POST | `/api/interviews` | JWT | Create session (costs 1 credit) |
| GET | `/api/interviews/:id` | JWT | Full interview detail |
| PATCH | `/api/interviews/:id` | JWT | Update answers / status / feedback |
| DELETE | `/api/interviews/:id` | JWT | Delete interview |
| GET | `/api/users/credits` | JWT | Credit balance |
| PATCH | `/api/users/profile` | JWT | Update name |

## Deployment (Render)

1. Push this repo to GitHub.
2. **Server** — New Web Service: root `./server`, build `npm install`, start `npm start`, add env vars.
3. **Client** — New Static Site: root `./client`, build `npm run build`, publish `dist`, set `VITE_API_URL` to your server URL.
