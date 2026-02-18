# KOVO Apka

> Internal company PWA for a Czech manufacturing organization — HR, resource reservations, communication, gamification, and more.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748?logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

---

## Features

| Module | Description |
| --- | --- |
| **Dashboard** | Personal overview with quick stats, upcoming events, and recent activity |
| **HR Requests** | Vacation, sick days, doctor visits & personal days — submit, approve, track balances |
| **Resource Reservations** | Book company cars, meeting rooms, tools & parking spots with conflict detection |
| **News & Announcements** | Rich-text articles with Markdown support, pinning, and read tracking |
| **Polls & Surveys** | Single-choice, multi-choice & free-text polls with real-time results |
| **Job Board** | Internal job postings with application workflow |
| **Marketplace** | Employee-to-employee item listings (sell, buy, give away) |
| **Rewards & Gamification** | Points system with leaderboard and reward catalog |
| **Admin Dashboard** | User management, analytics charts, system settings (admin-only) |
| **Dark Mode** | System-aware or manual light / dark theme toggle |
| **PWA & Push Notifications** | Installable on mobile, Firebase Cloud Messaging for real-time alerts |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16.1.6** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| UI | **React 19**, **Tailwind CSS 4**, **Lucide React** icons |
| Database | **PostgreSQL** via **Prisma 7.3** (driver adapter `@prisma/adapter-pg`) |
| Auth | **NextAuth v5** (beta.30) — Credentials provider, JWT strategy, RBAC middleware |
| Push Notifications | **Firebase Cloud Messaging** (firebase + firebase-admin) |
| Charts | **Recharts 3** |
| Validation | **Zod 4** |
| Theming | **next-themes** (class strategy) |
| Other | react-day-picker, react-markdown, remark-gfm, date-fns, bcrypt |

## Prerequisites

- **Node.js** ≥ 20 (recommended 22 LTS)
- **PostgreSQL** ≥ 15 running locally or remotely
- **npm** (ships with Node.js)

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/kovo-app.git
cd kovo-app
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env .env.local
```

Required variables in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kovo_app?schema=public"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="http://localhost:3000"
```

> **Tip:** Generate a secure secret:
> ```bash
> openssl rand -base64 32
> ```

Optional — Firebase push notifications (uncomment and fill in `.env.local`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="..."
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account",...}'
```

Optional — realtime Socket.IO configuration:

```env
# Local dev (default fallback already works):
# NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"

# Production behind reverse proxy (recommended):
NEXT_PUBLIC_SOCKET_URL="https://your-domain.tld"
NEXT_PUBLIC_SOCKET_PATH="/socket.io"
```

> For HTTPS production, do not connect browser clients directly to `:3001` unless that port has TLS termination.
> Recommended setup is TLS on your reverse proxy and forwarding `/socket.io` to the internal socket server.

### 3. Set up the database

```bash
# Push schema to database (creates all tables)
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with demo data (Czech manufacturing company)
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the seeded admin account:

| Field | Value |
| --- | --- |
| Email | `admin@kovo.cz` |
| Password | `Heslo123!` |

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset database and re-seed |

## Project Structure

```
src/
├── actions/          # Server Actions (HR, reservations, polls, admin, ...)
├── app/
│   ├── (app)/        # Authenticated routes
│   │   ├── admin/    # Admin dashboard & user management
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── marketplace/
│   │   ├── news/
│   │   ├── polls/
│   │   ├── profile/
│   │   ├── requests/ # HR requests
│   │   ├── reservations/
│   │   ├── rewards/
│   │   └── settings/
│   ├── (auth)/       # Login page
│   └── api/          # API routes (auth, push notifications)
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Prisma client, auth config, Firebase, utilities
└── generated/        # Prisma generated client (gitignored)

prisma/
├── schema.prisma     # 21 models, 12 enums
└── seed.ts           # Comprehensive Czech demo data
```

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Set environment variables in Vercel dashboard (`DATABASE_URL`, `NEXTAUTH_SECRET`, Firebase keys).
4. Vercel auto-detects Next.js — builds and deploys automatically.
5. Set `NEXTAUTH_URL` to your production domain.

> **Database:** Use a managed PostgreSQL provider (e.g., Neon, Supabase, Railway, or Vercel Postgres).

## License

Private — internal company application. All rights reserved.
