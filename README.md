# HRMS — Login & Signup (Next.js + Supabase)

Grey / royal-blue themed auth flow for the HRMS hackathon project. Signup
creates a company account and auto-generates an **Employee ID**; the user
then logs in with that ID (not their email).

## Employee ID format

```
[First 2 letters of first name][First 2 letters of last name][YY][SSS]
```
Example: **John Smith**, joins in 2026, 1st person onboarded that year →
`JOSM26001`

- Letters are uppercased.
- If a name part is shorter than 2 letters it's padded with `X`.
- The 3-digit serial resets every calendar year and increments per signup
  (handled atomically by a Postgres function, see schema.sql).

## 1. Set up Supabase (5 min)

1. Go to https://supabase.com → create a new project.
2. In the dashboard, open **SQL Editor** → paste the contents of
   `supabase/schema.sql` → Run. This creates:
   - `profiles` table (RLS-protected)
   - `year_serials` table + `get_next_serial()` function
   - `get_email_by_employee_id()` function (lets the login page resolve an
     Employee ID to the real email before calling Supabase Auth)
   - `company-logos` public storage bucket + policies
3. **Important for the demo:** go to **Authentication → Providers → Email**
   and turn **OFF** "Confirm email". This app expects a session to exist
   immediately after `signUp()` so it can write the profile row and upload
   the logo. (Re-enable it later — this is a hackathon shortcut, not a
   production setting.)
4. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.local.example .env.local
# then paste your Project URL + anon key into .env.local
```

## 3. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → redirects to `/login`.
Click "Create an account" to sign up, then use the generated Employee ID
shown on screen to log in.

## Pages

- `/signup` — company name, full name, email, phone, password, confirm
  password, company logo upload. On success, shows the generated Employee
  ID.
- `/login` — sign in with Employee ID + password.
- `/dashboard` — placeholder landing page after login (swap in Profile /
  Attendance / Leave Requests widgets from your SRS next).

## How the Employee-ID login works under the hood

Supabase Auth is email/password-based, so this app keeps the real email
in `profiles.email` and:

1. **Login page** calls the `get_email_by_employee_id` RPC to resolve the
   typed Employee ID → email.
2. Then calls `supabase.auth.signInWithPassword({ email, password })` as
   normal.

The user never sees or types their email at login — only the generated ID.

## Notes / known hackathon shortcuts

- Storage upload policy allows anonymous inserts to `company-logos` to
  avoid session-timing issues during signup — tighten after judging.
- No forgot-password flow yet (add `supabase.auth.resetPasswordForEmail`
  if you have time).
- Serial numbers are global per year, not per company. If you need
  per-company numbering, add `company_name` (or a `company_id`) to the
  `get_next_serial` lookup key.
