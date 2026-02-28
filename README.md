# Auth Boilerplate

Reusable Next.js starter with:

- Firebase Authentication (Google + Email/Password)
- Role-based access control (Super User, Admin, User)
- Granular permissions
- Route guards for protected/admin areas
- Feature flags (`comments_enabled`, `analytics_enabled`)
- Reusable commenting module
- Built-in website analytics dashboard
- Audit logs for admin actions
- Dockerized app + Postgres

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Firebase Client SDK + Firebase Admin SDK
- Prisma ORM + PostgreSQL
- Recharts (analytics charting)
- Docker + Docker Compose

## Quick Start

1) Copy environment values:

```bash
cp .env.example .env
```

2) Fill Firebase + session settings in `.env`:

- `NEXT_PUBLIC_FIREBASE_*`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `APP_SESSION_SECRET`

3) Start database:

```bash
docker compose up -d db
```

4) Install + migrate + seed:

```bash
npm install
npm run db:generate
npx prisma migrate dev --name init
npm run db:seed
```

5) Start app:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Default Roles

- `super_user`: full access
- `admin`: users read/update, comments manage, analytics read, audit logs read
- `user`: comments create/read, profile manage

Users are assigned `user` role on first login. If `SUPER_USER_EMAIL` is set, that email also receives `super_user`.

## Route Protection

- Public: `/`, `/login`, `/register`
- Auth required: `/dashboard/**`
- Admin only: `/dashboard/admin/**` (`admin` or `super_user`)

## Feature Flags

Managed via `/dashboard/admin/settings`:

- `comments_enabled`
- `analytics_enabled`

## Analytics Tracking

Client tracker captures:

- Page views
- Click events (`data-track="..."`)
- Time-on-page

Admin dashboard at `/dashboard/admin/analytics` shows visits, unique visitors, top pages, top clicks, and average time on page.

## Project Scripts

- `npm run dev` - run local server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint code
- `npm run db:generate` - generate Prisma client
- `npm run db:migrate` - create/apply dev migration
- `npm run db:deploy` - apply migrations in deployment
- `npm run db:seed` - seed roles, permissions, flags

## Docker

App and database are defined in `docker-compose.yml`.

- App: `localhost:3000`
- Postgres: host port `5433` -> container `5432`

For full setup automation:

```bash
./scripts/setup.sh
```
