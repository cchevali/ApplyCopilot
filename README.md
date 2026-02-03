# ApplyCopilot

Human-in-the-loop job application copilot for Northern Virginia targets. Local-first, single-user, and compliance-first.

## Quick Start
1. Copy `.env.example` to `.env` and update secrets.
2. Install dependencies:
   ```bash
   pnpm i
   ```
   Build scripts are pre-approved via `pnpm-workspace.yaml`, so installs stay non-interactive.
   Then generate Prisma client if needed:
   ```bash
   pnpm prisma generate
   ```
3. Start Postgres:
   ```bash
   docker compose up -d
   ```
4. Run migrations + seed:
   ```bash
   pnpm prisma migrate dev
   pnpm seed
   ```
5. Run the app:
   ```bash
   pnpm dev
   ```
6. Visit `http://localhost:3000` and log in with the seeded admin credentials.
   Defaults: `admin@example.com` / `changeme` (change via env).

## Commands
- `pnpm dev` - run the dev server
- `pnpm prisma migrate dev` - apply schema migrations
- `pnpm seed` - create admin user and default target profile
- `pnpm test` - run Vitest suite
  - Requires Postgres running (`docker compose up -d`)

## Architecture Overview
- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth (Credentials provider)
- Local storage at `./storage` for resume uploads
- Deterministic scoring in `lib/scoring.ts`
- ATS importers in `lib/ats/`
- Server actions in `lib/actions.ts`

### Data Flow
1. Resume upload saves file to `./storage` and extracted text to `Resume`.
2. Experience inventory is manually verified (or auto-suggested).
3. Jobs are added manually or imported via Greenhouse/Lever.
4. Deterministic scoring creates `JobScore` records.
5. Packet generation reorders verified bullets and stores `Packet`.

## ATS Importers
All importers live in `lib/ats/`. To add a new ATS:
1. Implement a fetcher with rate limiting and a clear User-Agent.
2. Parse only public endpoints. Do not bypass login or scrape prohibited sources.
3. Call it from a server action in `lib/actions.ts`.
4. Ensure dedupe via `computeJobHash` in `lib/dedupe.ts`.

## Security Notes
- Resumes are treated as sensitive and never logged.
- Authentication is required for all pages beyond `/login`.
- Only verified experience items can be used for tailoring.

## Optional AI
If `OPENAI_API_KEY` is set, AI assists with:
- Resume-to-structure suggestions
- Bullet rephrasing for tailored packets

The app remains fully usable without AI.

## Security
- Next.js is pinned to a patched 14.x release. See `SECURITY.md`.

## CI
GitHub Actions runs Prisma generate/migrate/seed plus unit + integration tests against a Postgres service container.

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - base URL for NextAuth
- `NEXTAUTH_SECRET` - long random secret for sessions
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - seed credentials
- `STORAGE_PATH` - local path for uploads (default `./storage`)
- `OPENAI_API_KEY` - optional
