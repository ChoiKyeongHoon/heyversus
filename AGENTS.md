# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`, with Next.js App Router pages and layouts under `src/app/`.
- Shared UI sits in `src/components/`, domain helpers in `src/lib/`, and global middleware in `src/middleware.ts`.
- Static assets reside in `public/`; configuration lives at the root (`next.config.ts`, `tailwind.config.ts`, `eslint.config.mjs`).
- Keep new modules colocated with the feature they support; prefer client/server split via `use client` boundaries.

## Build, Test, and Development Commands
- `npm run dev` – start the local Next.js dev server with hot reload.
- `npm run build` – produce an optimized build using Turbopack (mirrors CI expectations).
- `npm run start` – run the production build locally for smoke checks.
- `npm run lint` – execute ESLint with the project config; run before every PR.

## Coding Style & Naming Conventions
- TypeScript is required; use modern ES modules and async/await.
- React components use PascalCase files (e.g., `FeaturedPollClient.tsx`); hooks and utilities use camelCase.
- Follow Tailwind utility-first styling; keep variant logic encapsulated in `class-variance-authority` helpers when needed.
- Respect ESLint warnings and fix formatting issues inline; no auto-format tool is configured, so rely on editor settings (2-space indent recommended).

## Testing Guidelines
- Automated tests are not yet scaffolded; when adding them, colocate with features or use `src/__tests__/`.
- Favor React Testing Library or Playwright for UI flows and mock Supabase interactions where possible.
- For manual QA, verify sign-in, poll creation, voting (public and private), and score updates.
- Document any new test commands in `package.json` and mention them in the PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`) as seen in the existing history.
- Keep commits focused and descriptive; include context for Supabase migrations or schema changes.
- Pull requests should outline the change, testing evidence (`npm run lint`/manual steps), and link related issues.
- Add screenshots or short clips for UI updates, especially changes to poll creation or voting flows.

## Security & Configuration Notes
- Store Supabase keys and auth secrets in `.env.local`; never commit secrets.
- When editing auth or middleware logic, confirm redirects and session handling by signing in/out locally.
- Review `QUERY.md` before modifying schema-related code to ensure migrations stay aligned.
