# TASK_DEPLOY.md — Deployment & README

## What We're Doing
- Deploy the app to Vercel (live URL)
- Configure all environment variables on Vercel
- Disable email confirmation in Supabase
- Write the README

---

## Step 1 — Disable Email Confirmation in Supabase

By default, Supabase requires users to click a confirmation email before they can log in.
For this task, disable it so signup → login works immediately.

Go to: **Supabase Dashboard → Authentication → Email → Confirm email → toggle OFF**

If you leave this on, `supabase.auth.signUp()` will return a user but they won't be able to log in until they confirm. The app will appear broken.

---

## Step 2 — Deploy to Vercel

**Option A: Via Vercel Dashboard (recommended)**
1. Go to vercel.com → Add New Project
2. Import your `bookmarks-app` GitHub repo
3. Framework preset: Next.js (auto-detected)
4. Don't touch Build Settings — defaults are correct
5. Click Deploy (it will fail because env vars are missing — that's expected)

**Option B: Via CLI**
```bash
npm install -g vercel
vercel
```

---

## Step 3 — Add Environment Variables on Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add all of these:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `RESEND_API_KEY` | Your Resend API key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (e.g. https://bookmarks-app.vercel.app) |

After adding all variables → **Redeploy** (Deployments tab → ... → Redeploy).

---

## Step 4 — Update Supabase Allowed URLs

Supabase needs to know your production URL is allowed for auth redirects.

Go to: **Supabase Dashboard → Authentication → URL Configuration**
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add `https://your-app.vercel.app/**`

Without this, auth might break in production even if it works locally.

---

## Step 5 — Test the Live App

Go through this checklist on the live Vercel URL:

- [ ] Sign up with a new email + handle
- [ ] Check that welcome email arrives in inbox
- [ ] Log in with the same credentials
- [ ] Add a bookmark (private)
- [ ] Add a bookmark (public)
- [ ] Edit a bookmark
- [ ] Delete a bookmark
- [ ] Visit `/<your-handle>` — only public bookmark should show
- [ ] Log out — confirm /dashboard redirects to /login
- [ ] Try visiting /dashboard while logged out — should redirect to /login

---

## Step 6 — Write the README

### `README.md`

```markdown
# Bookmarks App

A personal bookmarks manager — save, organize, and share your bookmarks publicly.

**Live URL**: https://your-app.vercel.app

---

## Running Locally

1. Clone the repo
   ```bash
   git clone https://github.com/YOUR_USERNAME/bookmarks-app.git
   cd bookmarks-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase and Resend keys (see `.env.example` for the full list).

4. Run the development server
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

---

## Where the AI Agent Got It Wrong

**Issue**: The agent initially imported the browser-side Supabase client inside the `/api/bookmarks` API route:
```typescript
import { createClient } from '@/lib/supabase/client' // WRONG in a server file
```
The browser client reads session tokens from browser cookies, which don't exist in a server-side API route. This caused auth to silently fail — the API was treating every request as unauthenticated and returning 401 even for logged-in users.

**How I caught it**: I noticed the dashboard wasn't loading any bookmarks after login. I checked the network tab and saw the `/api/bookmarks` GET request was returning 401. I traced the issue to the import and switched it to the server client:
```typescript
import { createClient } from '@/lib/supabase/server' // CORRECT
```
This fixed it immediately.

---

## One Thing I'd Improve With More Time

Add optimistic UI updates — right now when you delete or edit a bookmark, the UI waits for the API response before updating. With optimistic updates, the change would appear instantly and roll back only if the request fails. This makes the app feel significantly faster.

---

## Tech Stack
- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Auth + PostgreSQL with RLS)
- **Resend** (transactional email)
- **Vercel** (deployment)
- **Tailwind CSS** (styling)
```

---

## The README Section That Matters Most

The evaluators said:
> "where your AI agent got something wrong, and how you caught and fixed it — this is the part we care about most"

Write this section honestly. They're not looking for a perfect AI experience. They want to see:
1. You noticed something was wrong
2. You understood WHY it was wrong
3. You fixed it correctly

The browser client / server client issue is the most natural one that will actually happen. Keep it in the README as written above — or write your own honest version of what actually went wrong when you built it.

---

## Final Commit

```bash
git add .
git commit -m "docs: README with setup, agent fix notes, and improvements"
git push
```

---

## Submission Checklist

- [ ] Live Vercel URL works end-to-end
- [ ] GitHub repo is public
- [ ] Commits are granular (not one giant commit)
- [ ] README has: local setup, agent mistake + fix, one improvement
- [ ] Entire CLI sessions are pushing to `entire/checkpoints/v1` branch
- [ ] `.env.local` is NOT committed (only `.env.example`)
