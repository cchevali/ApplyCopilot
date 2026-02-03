# ApplyCopilot Agent Notes

## Constraints (Non-Negotiable)
- Human-in-the-loop only: no automated form submission or CAPTCHA bypassing.
- Compliance: only manual entry or public ATS endpoints (Greenhouse/Lever).
- Truthfulness: never invent experience; only verified inventory may be used.
- Security: treat resumes as sensitive; sanitize inputs and avoid logging content.

## Local Commands
- `pnpm i`
- `docker compose up -d`
- `pnpm prisma migrate dev`
- `pnpm seed`
- `pnpm dev`
- `pnpm test`

## Architecture Overview
- Next.js 14 App Router
- Prisma + PostgreSQL
- NextAuth (Credentials)
- Local file storage at `./storage`
- Deterministic scoring in `lib/scoring.ts`
- Server actions in `lib/actions.ts`
- ATS importers in `lib/ats/`

## Add New ATS Importers Safely
1. Create a new fetcher in `lib/ats/` that uses public endpoints only.
2. Add rate limiting via `lib/rateLimit.ts` and include a descriptive `User-Agent`.
3. Parse responses into normalized job objects with `title`, `location`, `url`, `description`.
4. Deduplicate using `computeJobHash` in `lib/dedupe.ts`.
5. Wire the importer into `lib/actions.ts` and expose it in `/jobs`.

## Data Safety
- Resume text is stored in the database, raw file stored in `./storage`.
- Never log resume contents.
