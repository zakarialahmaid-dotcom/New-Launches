# New Launches CRM

A small web app for the visibility plan used when a brand, seller or subcategory is **onboarded or reactivated**.

- **Commercial** submits the request: brand, onboarding or reactivation, category, KAM, requested go-live, whether stock is ready, landing page, offer, hero SKUs.
- **Marketing** decides, confirms the go-live date (this is week 1), picks the month 2 and month 3 P1 weeks after the CP call, and books the placements with their dates.
- The app builds the rest itself:
  - **This week:** who is P1 or P2, what to push, and what is still missing.
  - **12-week plan** for each launch.
  - **Monthly calendar** for one brand or all brands, ready to print or save as PDF.
  - **CSV export** for each launch.

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
4. **Add the environment variables.** Under **Settings → Environment Variables**:
   | Name | Value |
   |---|---|
   | `COMMERCIAL_PASSCODE` | the passcode you give the commercial team |
   | `MARKETING_PASSCODE` | the passcode for the marketing team |
   | `AUTH_SECRET` | any long random string (for example from `openssl rand -hex 32`) |
   | `APP_TIMEZONE` | `Africa/Casablanca` (optional; this is the default) |
5. **Deploy.** Go to Deployments → Redeploy so the new variables are picked up. The tables are created automatically on first use.
6. **Optional first step:** sign in with the marketing passcode, open **Requests**, and click *Load the October examples*. This loads LC Waikiki, City Fashion and Absolut New York with their October placements.

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

## Files

```
app/page.tsx                 This week dashboard
app/requests/                Requests list + new request form
app/launch/[id]/             Request page (both sides, 12-week plan, placements, calendar, CSV export)
app/calendar/                Monthly calendar (all brands or one)
app/actions.ts               Server actions (create, update, book, seed)
lib/plan.ts                  Visibility rules (P1/P2, what's missing, status)
lib/db.ts                    Postgres connection + auto-created tables
lib/auth.ts                  Passcode login (signed cookie)
```
