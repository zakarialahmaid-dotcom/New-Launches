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

Stack: Next.js 15 on Vercel, with a **Google Sheet as the database** (tabs `Launches`, `Placements`, `History`, one row per item). Everything is free.

---

## 1. Connect the Google Sheet (5 minutes)

1. Create a new Google Sheet (for example "New Launches CRM data").
2. Open **Extensions → Apps Script**, delete what's there, and paste in [`apps-script/Code.gs`](apps-script/Code.gs).
3. At the top of the script, replace `CHANGE-ME` in `const TOKEN = 'CHANGE-ME'` with a long secret of your choice. Click **Save**.
4. In the function dropdown pick **setup** and click **Run**. Accept the permissions once. This creates the three tabs.
5. Click **Deploy → New deployment**, set the type to **Web app**, then:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

> If "Anyone" isn't offered (some company Google accounts block it), create the sheet and script with a personal Gmail account instead. Only the app can reach the URL, because every call has to include the token.

## 2. Deploy on Vercel

1. Import the GitHub repository in Vercel (Add New → Project). Leave the build settings as they are.
2. Under **Settings → Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `SHEETS_API_URL` | the Web app URL from step 1.5 |
   | `SHEETS_API_TOKEN` | the same secret as `TOKEN` in the script |
   | `MARKETING_EMAILS` | optional, default `zakaria.lahmaid@jumia.com`. Comma-separated emails with the marketing role; everyone else is commercial |
   | `ALLOWED_EMAIL_DOMAINS` | optional, default `jumia.com`. Leave empty to allow any email |
   | `APP_TIMEZONE` | optional, default `Africa/Casablanca` |
3. Go to **Deployments → Redeploy**.
4. Open `https://<your-app>.vercel.app/api/health`. You should see `"ok": true` and your sheet's name. If not, it shows the exact error.
5. Optional: sign in with a marketing email, open **Requests**, and click *Load the October examples*.

If you used Neon before, you can remove it: the app doesn't use `DATABASE_URL` any more.

**Editing the sheet by hand:** this is fine. Rows can be edited, added or deleted directly in Google Sheets. Keep the header row as it is, and give each new row a unique number in the `id` column. If you change the script later, publish the change with Deploy → Manage deployments → ✏️ → Version: New version → Deploy, so the URL stays the same.

## Run locally

```bash
cp .env.example .env.local   # then fill in SHEETS_API_URL and SHEETS_API_TOKEN
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
lib/data.ts                  Google Sheet data layer (calls the Apps Script web app)
apps-script/Code.gs          Script to paste into the Google Sheet (Extensions → Apps Script)
app/api/health/              Setup check: /api/health
lib/auth.ts                  Email sign-in (signed cookie), roles from MARKETING_EMAILS
app/history/                 Activity history (everyone / my activity)
components/HistoryList.tsx   History table
```
