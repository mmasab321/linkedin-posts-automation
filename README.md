# LinkedIn Auto-Poster

Next.js app: generate LinkedIn drafts with Kimi 2.5 (Moonshot), approve & schedule via GetLate. Multi-user: each user has their own drafts, settings, and quota (20 posts/month). Sign up with email/password to use the app.

## Authentication

- **Sign up** at `/signup` (email + password, min 8 characters). Each user gets their own API keys (Settings), drafts, autopilot config, and topic pool.
- **Sign in** at `/signin`. Protected routes (Dashboard, Generate, Settings) require a logged-in session.
- **Required env:** Set **`AUTH_SECRET`** (e.g. `openssl rand -base64 32`) for JWT signing. Without it, NextAuth may refuse to start in production.

### Claiming existing data after first deploy (migration)

If you had data before auth (drafts, API keys, scheduled posts), the migration assigns it to a placeholder user. To create **your** account and move that data to you:

1. Set **`CLAIM_SECRET`** in Vercel (e.g. same as `AUTH_SECRET` or a random string). Optional: you can use **`CRON_SECRET`** instead if already set.
2. After deploy, call the claim endpoint once (e.g. from your machine):

   ```bash
   curl -X POST https://your-app.vercel.app/api/auth/claim \
     -H "Authorization: Bearer YOUR_CLAIM_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"your-secure-password","name":"Your Name"}'
   ```

3. Sign in at `/signin` with that email and password. Your existing posts, settings, and quota will be there.

## Deploy on Vercel

The app uses **PostgreSQL** (SQLite cannot run on Vercel’s serverless environment).

1. **Create a Postgres database**
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Dashboard → Storage → Create Database), or  
   - [Neon](https://neon.tech) (free tier), or any Postgres host.

2. **Environment variables**
   - **`DATABASE_URL`** – Postgres connection string (e.g. `postgresql://user:pass@host:5432/dbname?sslmode=require`).
   - **`AUTH_SECRET`** – Secret for session signing (e.g. run `openssl rand -base64 32` and paste the result).

3. **Build command** (optional override)
   - `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`  
   - Or leave default; ensure **Build Command** includes `npx prisma generate` and `npx prisma migrate deploy` before `npm run build`.

4. After deploy, open **Settings** in the app and add your GetLate API Key, Moonshot API Key, and LinkedIn Account ID (they’re stored in the DB).

5. **Autopilot (optional):** In **Settings → Autopilot** you can enable hands-free posting. Add RSS feed URLs and/or evergreen topics, set max auto-posts per month and validation strictness. Two crons run daily: **RSS fetch** at 7:00 UTC (`/api/cron/fetch-rss`) fills the topic pool from your RSS feeds; **autopilot** at 8:00 UTC (`/api/cron/autopilot`) picks a topic, generates a draft, and (if the score is high enough) sends an approval email or auto-schedules. Set **`CRON_SECRET`** in Vercel env to protect cron endpoints. Use **Fetch RSS now** in Settings to refresh topics on demand.

   **How autopilot works:** Every day the RSS cron fetches your configured feeds and adds new article titles into the topic pool (avoiding near-duplicates from the last 30 days). The autopilot cron then runs for each user with autopilot on: it picks a topic from the pool, generates a LinkedIn draft with Moonshot, and scores it. If the score meets your “min score to auto-approve” (e.g. 95+), the app either sends an approval email to `APPROVAL_EMAIL` with Approve/Reject links or (if you didn’t set that) can auto-schedule; when you approve via the link, the post is scheduled with GetLate at your chosen time. If the score is too low, the draft stays in the queue and is not published.

6. **Email approval (optional):** For autopilot to send you review emails, set **`APPROVAL_EMAIL`** (the address that receives Approve/Reject links) along with **`RESEND_API_KEY`** and **`NEXT_PUBLIC_APP_URL`**. If `APPROVAL_EMAIL` is missing, autopilot will not send emails. Add these env vars:
   - **`RESEND_API_KEY`** – from [Resend](https://resend.com). Used to send the approval email.
   - **`APPROVAL_EMAIL`** – email address that receives the review emails.
   - **`NEXT_PUBLIC_APP_URL`** – your app’s base URL (e.g. `https://your-app.vercel.app`) for building the approve/reject links.
   - **`RESEND_FROM`** (optional) – sender address, e.g. `LinkedIn Auto-Poster <notifications@yourdomain.com>`. Defaults to Resend’s onboarding address if unset.

## Deploy on Render

1. **Environment variables** (Dashboard → your Web Service → Environment):
   - **`DATABASE_URL`** = your **PostgreSQL** connection string (required). Use [Render Postgres](https://render.com/docs/databases) or an external Postgres (Neon, etc.). SQLite is not supported on serverless/read-only filesystems.
   - Optionally add API keys in the app’s **Settings** page after deploy so they’re stored in the DB.

2. **Build command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`

3. **Start command:** `npm start`

4. **Avoid OOM on 512MB:** In Render → Environment, add **`NODE_OPTIONS`** = **`--max-old-space-size=460`** so the build stays under 512MB. The app uses `next build --webpack` (not Turbopack) to reduce memory.

Note: Render’s filesystem is ephemeral by default, so the DB can be reset on redeploy. For persistent data, add a [Persistent Disk](https://render.com/docs/disks) and set `DATABASE_URL` to a path on that disk (e.g. `file:/opt/render/project/data/sqlite.db`).

## Getting Started (local)

You need a **PostgreSQL** database. Use a local Postgres, [Neon](https://neon.tech), or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), then set **`DATABASE_URL`** in a `.env` file (e.g. `postgresql://user:pass@localhost:5432/mydb`). Then run migrations and the dev server:

```bash
npx prisma migrate deploy
npm run dev
```

Or only the dev server if the DB is already migrated:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
