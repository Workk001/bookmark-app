# Bookmarks App

Bookmarks App is a personal links and bookmark manager that allows authenticated users to save links, mark them as public or private, and display public links on a dynamic `/<handle>` landing page. The application enforces database-level privacy constraints via PostgreSQL Row Level Security (RLS) so that private bookmarks remain invisible and unmodifiable to other users, while guest visitors can access a user's public profile page without authentication.

## Live URL
[https://bookmark-app-lovat-seven.vercel.app]

## Local Setup

Follow these steps to run the application locally:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bookmarks-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a local environment file from the template and fill in your Supabase and MailerSend API keys:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Log — AI Agent Mistakes & Fixes

### Mistake 1: Default boilerplate never replaced
**What the agent did wrong:** Left `src/app/page.tsx` as the default Next.js starter page instead of implementing redirect logic.
**Why it was wrong:** Users visiting the homepage did not get navigated to the login or dashboard page.
**How it was caught:** Manual browser verification of the root route (`/`).
**How it was fixed:** Updated `src/app/page.tsx` to read the session and redirect using `redirect('/dashboard')` or `redirect('/login')`.

### Mistake 2: Dashboard files left empty
**What the agent did wrong:** Left both `src/components/Dashboard.tsx` and `src/app/dashboard/page.tsx` as empty files.
**Why it was wrong:** Navigating to the dashboard rendered nothing and resulted in a blank screen.
**How it was caught:** Visual inspection of the dashboard page after signing in.
**How it was fixed:** Created the layout, components, and data loading mechanisms inside these files to show bookmarks and allow management.

### Mistake 3: Client-side Supabase client inside API routes
**What the agent did wrong:** Imported `createClient` from `@/lib/supabase/client` inside API handlers (`src/app/api/bookmarks/route.ts` and `src/app/api/welcome/route.ts`).
**Why it was wrong:** The browser client is unable to read request cookies server-side in API routes, leading to auth failing silently.
**How it was caught:** Network requests returning `401 Unauthorized` even with active sessions.
**How it was fixed:** Switched imports to use `createClient` from `@/lib/supabase/server`.

### Mistake 4: Empty API route stub
**What the agent did wrong:** Left the API route file `src/app/api/bookmarks/route.ts` as an empty file containing only `export {}`.
**Why it was wrong:** Requests to perform CRUD operations on bookmarks failed completely.
**How it was caught:** The frontend threw errors when attempting to load or mutate bookmarks from the dashboard.
**How it was fixed:** Fully implemented the GET, POST, PATCH, and DELETE handlers inside the route file.

### Mistake 5: Database table-level GRANT permissions missing
**What the agent did wrong:** Did not run the necessary SQL command to grant schema access privileges to the required tables.
**Why it was wrong:** Supabase returned permission denied errors (`42501`) when attempting to read or write to tables like `profiles` or `bookmarks`.
**How it was caught:** DB queries triggered error responses with a `42501` code.
**How it was fixed:** Ran SQL grants inside the database:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO anon, authenticated, service_role;
  ```

### Mistake 6: Incorrect update payload filtering
**What the agent did wrong:** The PATCH handler in `src/app/api/bookmarks/route.ts` tried to update the database table directly with the request body, or updated `is_public` without type checking.
**Why it was wrong:** It exposed read-only or sensitive database fields to arbitrary client updates and caused type issues.
**How it was caught:** Code review of the PATCH API route.
**How it was fixed:** Created a filtered `updatePayload` object that only includes verified and typed fields like `title`, `url`, and `is_public`.

### Mistake 7: Client-side fetch returning 401/405 without details
**What the agent did wrong:** Client-side fetches to API endpoints swallowed server errors and failed to show descriptive toast alerts/messages in the UI.
**Why it was wrong:** Users and developers had no insight into why operations like adding or updating bookmarks were failing.
**How it was caught:** Submitting invalid links caused the form to stall or fail without error message feedback.
**How it was fixed:** Updated form and card handlers to read `data.error` from the JSON response and render it in the UI.

### Mistake 8: Hardcoded mock user ID
**What the agent did wrong:** Used a hardcoded user ID string instead of getting the authenticated user's ID via `supabase.auth.getUser()`.
**Why it was wrong:** Prevented database-level user isolation, resulting in foreign key constraint violations or users writing to others' scopes.
**How it was caught:** Creating a bookmark failed due to invalid user reference.
**How it was fixed:** Replaced the hardcoded ID with `user.id` from `supabase.auth.getUser()`.

### Mistake 9: Incorrect signout action
**What the agent did wrong:** Redirected users on logout using standard routing (`router.push('/login')`) without triggering a server cache refresh.
**Why it was wrong:** Cache persistence kept the user's dashboard pages rendered in the browser, showing stale authenticated states.
**How it was caught:** Logging out redirected to `/login`, but hitting the back button showed the dashboard cached state.
**How it was fixed:** Added `router.refresh()` immediately after signing out.

### Mistake 10: Welcome email routing error
**What the agent did wrong:** Attempted to use the wrong API client structure (e.g. Resend client/credentials) or wrong API key variable instead of MailerSend configured keys.
**Why it was wrong:** Caused welcome emails to fail to dispatch upon registration.
**How it was caught:** Checking MailerSend logs and seeing failed POST requests.
**How it was fixed:** Refactored the route to query `MAILERSEND_API_KEY` and call MailerSend HTTP endpoint with standard JSON parameters.

### Mistake 11: Undefined API path for check-handle
**What the agent did wrong:** Called `/api/check-handle` from the signup form without defining the route in the codebase.
**Why it was wrong:** The handle availability check returned 404, blocking registration.
**How it was caught:** Browser console errors and network logs during registration attempts.
**How it was fixed:** Created `src/app/api/check-handle/route.ts` with a GET handler checking handle existence in profiles.

### Mistake 12: Handle validation bypass on login
**What the agent did wrong:** Bypassed character/format validation or did not verify if user profiles existed.
**Why it was wrong:** Allowed invalid handles or logins to redirect to dashboard when profiles were missing.
**How it was caught:** Users without a matching profile redirected to the dashboard and encountered render errors.
**How it was fixed:** Validated handles against `/^[a-zA-Z0-9_]+$/` on signup and enforced checks on the dashboard to redirect users if no profile row existed.

### Mistake 13: RLS policy blocking profile setup
**What the agent did wrong:** Left the RLS insert policy for the `profiles` table missing or misconfigured.
**Why it was wrong:** Users could not write their profile row during registration, causing registration to crash.
**How it was caught:** Database errors when saving user profiles on signup.
**How it was fixed:** Configured the correct RLS policy: `CREATE POLICY "Users can only write their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);`.

### Mistake 14: Layout shift on slow auth check
**What the agent did wrong:** Triggered visual shifts/flashes on pages while waiting for async authentication checks.
**Why it was wrong:** Led to a poor user experience with shifting elements during client-side hydration.
**How it was caught:** Observing page loads on slow networks.
**How it was fixed:** Utilized Server Components for page-level auth checking, loading the data before page delivery.

### Mistake 15: Broken handle availability check on signup
**What the agent did wrong:** Performed handle availability checks after creating the auth user or used incorrect query logic.
**Why it was wrong:** Created orphaned auth users without profiles when the handle check failed late.
**How it was caught:** Duplicate handles during testing created accounts that were unusable.
**How it was fixed:** Moved the handle check logic to run BEFORE `supabase.auth.signUp()`.

## Future Improvements
* **Optimistic UI Updates**: With more development time, the client interface should adopt optimistic state transitions. Currently, the UI awaits the asynchronous API call confirmation before modifying local bookmark lists (causing visible delay on slower connections). By rendering local updates optimistically and rolling back states only on network failures, the user experience would feel instantaneous.

## Tech Stack
* **Next.js 16** (App Router, Server Components, TypeScript)
* **Supabase** (Auth Service & PostgreSQL Database with Row Level Security)
* **MailerSend** (Transactional email service for welcome signups)
* **Tailwind CSS** (Utility-first CSS styling)
* **Vercel** (Cloud serverless hosting)
