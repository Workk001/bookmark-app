
• 1. What the app does

  Bookmarks App lets users create an account with a unique handle and manage private or public bookmarks from a protected dashboard.
  Each user also has a public /<handle> profile that exposes only their public bookmarks.

  1. File structure to create

  bookmarks-app/
  ├── .env.example
  ├── README.md
  └── src/
      ├── middleware.ts
      ├── types/
      │   └── index.ts
      ├── lib/
      │   ├── resend.ts
      │   └── supabase/
      │       ├── client.ts
      │       ├── server.ts
      │       └── middleware.ts
      ├── components/
      │   ├── BookmarkCard.tsx
      │   ├── BookmarkForm.tsx
      │   ├── Dashboard.tsx
      │   └── LogoutButton.tsx
      └── app/
          ├── page.tsx
          ├── not-found.tsx
          ├── (auth)/
          │   ├── login/
          │   │   └── page.tsx
          │   └── signup/
          │       └── page.tsx
          ├── [handle]/
          │   └── page.tsx
          └── api/
              ├── bookmarks/
              │   └── route.ts
              └── welcome/
                  └── route.ts

  1. Three most critical rules

- Use the correct Supabase client for each runtime.
- Authenticate with auth.getUser(), never getSession().
- Check authentication before every database operation, with explicit user_id ownership filters on writes.

  1. Supabase import mistake to avoid

  Never import @/lib/supabase/client in Server Components or API routes. Client Components use client.ts; Server Components and API
  routes use server.ts; root middleware uses the middleware helper.

  1. What I will build first

  I will first read the relevant installed Next.js 16 documentation, as required by AGENTS.md. Then I will build the shared types,
  Supabase clients, and session middleware because authentication, route protection, and every later database operation depend on
  that foundation.

  I am ready to begin. No files were changed.
