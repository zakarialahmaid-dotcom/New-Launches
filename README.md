# New Launches CRM

A small web app for the visibility plan used when a brand, seller or subcategory is **onboarded or reactivated**.

- **Sign in with your work email.** There's no password. Your email is recorded on every request, booking and change, and everyone can see the full **History**.
- **Commercial** submits the request: brand, onboarding or reactivation, category, KAM, requested go-live, whether stock is ready, landing page, offer, hero SKUs.
- **Marketing** decides, confirms the go-live date (this is week 1), picks the month 2 and month 3 P1 weeks after the CP call, and books the placements with their dates.
- The app builds the rest itself:
  - **This week:** who is P1 or P2, what to push, and what is still missing.
  - **12-week plan** for each launch.
  - **Monthly calendar** for one brand or all brands, ready to print or save as PDF.
  - **CSV export** for each launch.
  - **History:** who created, changed, accepted or booked what, and when (overall, for each launch, or just your own activity).

Rules built in (from the agreed plan):

| When | Priority | Channels |
|---|---|---|
| Month 1 · week 1 | P1 (360 push) | Slider HP, KOL, social media, PN (at least 3 per week) |
| Month 1 · weeks 2–3 | P2 | Product floor (home page + cat page), PN |
| Month 1 · week 4 | P1 | Full 360 push again |
| Months 2 and 3 | 3 × P2 + 1 × P1 | P1 week chosen at the CP call (default: week 4) |
| All of month 1 | — | Jforce & CS sales challenge |

Stack: Next.js 15 and Postgres. Everything here runs on free tiers (Vercel Hobby plus Neon Free).

---

## Deploy on Vercel (about 10 minutes, free)

1. **Put the code on GitHub.** Create an empty repository, then from this folder run:
   ```bash
   git init && git add . && git commit -m "New launches CRM"
   git branch -M main
   git remote add origin https://github.com/<you>/launch-crm.git
   git push -u origin main
   ```
2. **Import the project in Vercel.** On vercel.com, choose Add New → Project and import the repository. Vercel detects Next.js, so leave the build settings as they are.
3. **Add a free database.** In the project, go to **Storage → Create Database → Neon (Postgres)** and pick the Free plan. Connect it to the project. This adds `DATABASE_URL` automatically.
4. **Optional environment variables** (under **Settings → Environment Variables**). The defaults already work:
   | Name | Default | What it does |
   |---|---|---|
   | `MARKETING_EMAILS` | `zakaria.lahmaid@jumia.com` | Comma-separated emails with the marketing role. Everyone else is commercial. |
   | `ALLOWED_EMAIL_DOMAINS` | `jumia.com` | Domains allowed to sign in. Leave empty to allow any email. |
   | `APP_TIMEZONE` | `Africa/Casablanca` | Timezone for "today" and the history times. |
   | `AUTH_SECRET` | derived from `DATABASE_URL` | Key that signs the login cookie. |
5. **Deploy.** Go to Deployments → Redeploy so the new variables are picked up. The tables are created automatically on first use.
6. **Optional first step:** sign in with a marketing email, open **Requests**, and click *Load the October examples*. This loads LC Waikiki, City Fashion and Absolut New York with their October placements.

Any Postgres works, for example Supabase's free tier. Set `DATABASE_URL` to its connection string.

## Run locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## How the teams use it

| Who | Where | What |
|---|---|---|
| Commercial | + New request | One request per new or reactivated brand, seller or subcategory |
| Commercial | Request page → *Stock fully available* = Yes | The plan starts only when the full stock is available and the brand is live on the site |
| Marketing | Request page → Marketing · scheduling | Accept, on hold or reject; confirmed go-live; P1 weeks after the CP call |
| Marketing | Request page → Placements | Book dates (a date range adds one row per day, for sliders and product floors) |
| Everyone | This week | Every Monday: P1 and P2 launches and their gaps |
| Everyone | Calendar | Pick a brand to get the monthly calendar to share |

Commercial can see everything, but can only edit the request side. Only marketing can change decisions, dates and placements.

> Sign-in is by email only, with no password or verification link. That keeps it simple for an internal tool, but anyone who knows a colleague's email could sign in as them. If you need real verification later, add a magic-link provider such as Auth.js with Resend (free tier).

## Files

```
app/page.tsx                 This week dashboard
app/requests/                Requests list + new request form
app/launch/[id]/             Request page (both sides, 12-week plan, placements, calendar, CSV export)
app/calendar/                Monthly calendar (all brands or one)
app/actions.ts               Server actions (create, update, book, seed)
lib/plan.ts                  Visibility rules (P1/P2, what's missing, status)
lib/db.ts                    Postgres connection + auto-created tables
lib/auth.ts                  Email sign-in (signed cookie), roles from MARKETING_EMAILS
app/history/                 Activity history (everyone / my activity)
components/HistoryList.tsx   History table
```
