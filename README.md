# RentBook

Track tenants, buildings and flats, and a monthly rent checklist. Each user signs in and only sees their own data.

- **Web app:** React + Vite, hosted on Vercel. `/` is the landing page with the **Download APK** button; `/app` is the app.
- **Android app:** the same code wrapped with Capacitor. GitHub Actions builds a signed APK on every push to `main` and attaches it to the `latest-apk` release.
- **Data and login:** Supabase (Postgres + email auth). Row Level Security in `supabase/schema.sql` keeps every user's rows private.

## 1. Set up Supabase (once)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and click **Run**.
3. In **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (e.g. `https://rentbook.vercel.app`) so confirmation emails link back to the site.
4. Copy the **Project URL** and **anon public key** from **Project Settings → API**.

## 2. Run locally

```bash
cp .env.example .env   # then fill in the two Supabase values
npm install
npm run dev
```

## 3. Vercel

Import the GitHub repo at https://vercel.com/new (framework: Vite). Add the environment variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.

## 4. Android APK (GitHub Actions)

Add these repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `ANDROID_KEYSTORE_BASE64` | `base64 -i keys/rentbook-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | contents of `keys/keystore-password.txt` |

Push to `main` (or run the workflow by hand). The APK appears at
`https://github.com/OWNER/REPO/releases/download/latest-apk/RentBook.apk`, which is where the website's button points.
If your repo isn't `mithulpranav24012008/rentbook`, set `VITE_APK_URL` in Vercel.

**Keep `keys/` backed up somewhere safe and never commit it.** Every APK must be signed with the same key so new versions install as updates.
