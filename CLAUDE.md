# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heyversus is a dynamic polling web application built with Next.js 15 (App Router) and Supabase. Users can create polls, vote on them, and earn points through participation. The app supports both authenticated and anonymous voting with robust duplicate prevention mechanisms.

## Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production (with Turbopack)
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing & Database
- No test framework is currently configured
- Database schema is defined in `QUERY.md` - apply it directly to Supabase SQL editor

## Architecture & Key Patterns

### 1. Supabase Client Pattern

**Server Components** (RSC): Use `@/lib/supabase/server`
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

**Client Components**: Use `@/lib/supabase/client`
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**Middleware**: Session management happens in `src/middleware.ts` using `@supabase/ssr`

### 2. Database Functions & RPC Calls

The application heavily relies on PostgreSQL functions defined in `QUERY.md`. Key RPC functions:

- `create_new_poll(question_text, option_texts[], is_public, expires_at)` - Creates poll with options atomically
- `increment_vote(option_id, poll_id)` - Handles voting logic with duplicate prevention and point awards
- `get_polls_with_user_status()` - Returns all public polls with user's voting status
- `get_poll_with_user_status(poll_id)` - Returns single poll with user's voting status
- `get_featured_polls_with_user_status()` - Returns featured polls for landing page
- `check_username_exists(username)` - Validates username availability
- `check_email_exists(email)` - Validates email availability

**Always use RPC functions instead of direct table queries** when these functions exist.

### 3. Voting System Architecture

**Duplicate Prevention Strategy:**
- **Authenticated users**: Enforced via `user_votes` table with UNIQUE constraint on `(user_id, poll_id)`
- **Anonymous users** (public polls only): Client-side prevention using localStorage
- The `increment_vote` function handles both cases automatically

**Points System:**
- Authenticated users earn 1 point per vote
- Points are awarded atomically within the `increment_vote` function
- Profile points are displayed in Navbar and leaderboard (`/score` page)

### 4. Page Structure & Rendering

**Server Components (default):**
- `/` - Landing page with featured polls
- `/polls` - All public polls list
- `/poll/[id]` - Poll detail and results
- `/score` - User leaderboard

**Client Components (use "use client"):**
- `/create-poll` - Poll creation form
- `/signin`, `/signup` - Authentication forms
- `PollsClient` - Client-side poll interactions
- `Navbar` - Navigation with session state

**Pattern**: Server components fetch initial data via RPC, pass to client components for interactivity.

### 5. Authentication Flow

- Uses Supabase Auth with email/password
- Session managed via middleware and RSC
- New user trigger: `handle_new_user()` creates profile automatically in `public.profiles`
- Username stored in `raw_user_meta_data` during signup, then copied to `profiles.username`

### 6. TypeScript Types

Type definitions in `src/lib/types.ts`:
- `Poll` - Base poll structure
- `PollOption` - Individual poll option
- `PollWithOptions` - Poll with options array
- `PollWithUserStatus` - Extended with user voting status

### 7. Styling

- Tailwind CSS with custom configuration
- shadcn/ui components (e.g., Button in `src/components/ui/`)
- Toast notifications via `sonner` library
- Global styles in `src/app/globals.css` and `src/app/global.css`

## Important Conventions

### Database Schema Updates
- All schema changes must be added to `QUERY.md`
- Functions use `CREATE OR REPLACE FUNCTION` or `DROP FUNCTION IF EXISTS` for idempotency
- RLS policies are dropped and recreated to avoid conflicts

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Poll Status & Expiration
- Polls have `status` field ('open' or 'closed')
- `expires_at` timestamp determines automatic closure
- Voting is blocked if poll is closed or expired (enforced in `increment_vote`)

## Common Development Workflows

### Adding a New Database Function
1. Add function definition to `QUERY.md` with `CREATE OR REPLACE` or `DROP IF EXISTS` pattern
2. Run the SQL in Supabase SQL editor
3. Call via `supabase.rpc('function_name', params)` in application code

### Creating a New Page
1. Add page file in `src/app/[route]/page.tsx`
2. Use server component by default for data fetching
3. Pass data to client component if interactivity needed
4. Import server Supabase client: `import { createClient } from "@/lib/supabase/server"`

### Adding a New Poll Feature
1. Update database schema in `QUERY.md` (add columns, functions, RLS policies)
2. Update TypeScript types in `src/lib/types.ts`
3. Modify relevant RPC functions to return new fields
4. Update UI components to display new data

## Known Issues & Technical Debt

**CRITICAL - review.md contains a comprehensive list of bugs and improvements. Check review.md before making changes.**

### P0: Critical Issues (Fix Immediately)
- **Shared selection state across poll cards** (src/app/polls/PollsClient.tsx): Single `selectedOptionId` state causes selection to be shared across all polls. Must use `Record<pollId, optionId>` pattern.
- **Null expires_at treated as expired**: Polls with `expires_at = null` (permanent polls) are incorrectly marked as closed. Must check for null before date comparison.

### P1: High Priority
- **No test framework configured**: Add Jest/Playwright for regression testing
- **Missing server-side validation**: `create_new_poll` lacks input validation (empty questions, insufficient options)
- **Missing TypeScript null handling**: `expires_at` should be `string | null` in types.ts
- **Performance issues**: No indexes on `poll_options(poll_id)`, `user_votes(poll_id, user_id)`
- **Client instance duplication**: Multiple components create Supabase clients on each render. Use `useMemo` or Context.
- **Deprecated Next.js 15 Image props**: Remove `layout`, `objectFit` - use `fill`, `sizes`, `style` instead

### P2: Medium Priority (UX/Code Quality)
- **Insufficient loading/error feedback**: Add skeleton UI and error toasts
- **Timezone issues in poll expiration**: `datetime-local` input doesn't account for user timezone
- **Inconsistent styling**: Hardcoded colors instead of Tailwind theme tokens
- **Duplicate global CSS**: Both `globals.css` and `global.css` imported
- **Legacy /poll page**: Old localStorage-based UI conflicts with Supabase data flow

### P3: Low Priority (Long-term)
- **Duplicated time calculation logic**: Extract `getTimeRemaining` to `src/lib/utils.ts`
- **Unsafe env variable handling**: Add startup validation for `process.env.VAR!` assertions
- **Complex form state**: Consider `react-hook-form` for create-poll page
- **Incomplete private poll feature**: UI exists but access control not implemented

**Reference review.md for detailed explanations and solutions.**

## Project-Specific Notes

- This is a Korean-language application (UI and comments are in Korean)
- The app uses Next.js 15 with Turbopack for faster builds
- Middleware runs on every request to manage Supabase sessions
- Featured polls (`is_featured = true`) appear on landing page
- User profiles are public and viewable by everyone (RLS policy)
