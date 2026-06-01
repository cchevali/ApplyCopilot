# ApplyCopilot

Human-in-the-loop job application copilot for Northern Virginia targets. Local-first, single-user, and compliance-first.

## Core Workflow (Simple)
1. **Setup**: upload resume, verify experience inventory, add GitHub profile link, confirm target profile.
2. **Today**: review today's top queue from daily refresh.
3. **Apply**: work one job at a time with packet + copy buttons, then mark submitted.

## Compliance Guardrails
- No unattended application submission.
- No CAPTCHA bypassing.
- No login wall automation.
- No LinkedIn scraping automation.
- Tailoring uses only verified experience; no fabricated claims.

## Quick Start
1. Copy `.env.example` to `.env` and update secrets.
2. Install dependencies:
   ```bash
   pnpm i
   ```
   Build scripts are pre-approved via `pnpm-workspace.yaml`, so installs stay non-interactive.
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
6. Visit `http://localhost:3000` and log in with seeded admin credentials.
   Defaults: `admin@example.com` / `changeme` (change via env).

### Windows PowerShell Note
If PowerShell blocks `pnpm.ps1`, run commands via `cmd`:
```bat
cmd /c pnpm dev
```

## Commands
- `pnpm dev` - run the dev server
- `pnpm dev:all` - run dev server + daily daemon
- `pnpm prisma migrate dev` - apply schema migrations
- `pnpm seed` - create admin user and default target profile
- `pnpm test` - run Vitest suite
- `pnpm jobs:refresh` - refresh all enabled job sources
- `pnpm queue:build` - build today's queue
- `pnpm daemon` - run local daily scheduler (06:00/06:10)

## Architecture Overview
- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth (Credentials provider)
- Local storage at `./storage` for resume uploads
- Deterministic scoring in `lib/scoring.ts`
- ATS importers in `lib/ats/`
- Server actions in `lib/actions.ts`

## Daily Refresh + Queue
- `jobs:refresh` fetches enabled sources (Greenhouse, Lever, Careers JSON-LD).
- `queue:build` creates today's top queue (default max 8).
- `daemon` schedules refresh at 06:00 and queue build at 06:10 local time.
- Disable daemon with `APPLYCOPILOT_DAEMON=0`.

## Job Sources
Configure sources in **Setup -> Job Sources**:
- Greenhouse board URL
- Lever company handle or URL
- Careers page URL containing schema.org `JobPosting` JSON-LD

## Save Job (LinkedIn-Friendly)
Use `/save` to capture a job manually:
- Paste URL
- Paste description
- Optional title/company/location fields

Optional Chrome extension in `extension/`:
- Click **Save to ApplyCopilot** on the current tab
- Opens `/save` prefilled with URL/title/company/location
- User pastes description manually

## GitHub Link Support
Add your GitHub URL in **Setup -> Profile Links**.
When a packet is generated, Field Pack includes `githubUrl` for quick copy/paste into application forms.

## Apply Session
Use `/apply` for one-at-a-time workflow:
- Open job URL
- Review score + reasons
- Auto-generate packet (requires verified experience)
- Copy key fields (job title, company, resume variant, GitHub if set)
- Mark **Submitted** or **Skip**

## ATS Importers
All importers live in `lib/ats/`. To add a new ATS safely:
1. Implement a fetcher with rate limiting and descriptive User-Agent.
2. Use public endpoints only.
3. Wire it via server actions in `lib/actions.ts` or refresh engine.
4. Dedupe via `computeJobHash` in `lib/dedupe.ts`.

## Security Notes
- Resumes are sensitive and are never logged.
- Authentication required for protected pages.
- Only verified experience can be used for tailoring.
- Next.js is pinned to a patched 14.x release. See `SECURITY.md`.

## CI
GitHub Actions runs Prisma generate/migrate/seed plus unit + integration tests against Postgres service container.

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - base URL for NextAuth
- `NEXTAUTH_SECRET` - random session secret
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - seed credentials
- `ADMIN_GITHUB_URL` - optional default GitHub profile for seeded admin
- `STORAGE_PATH` - local uploads path (default `./storage`)
- `OPENAI_API_KEY` - optional AI assist
