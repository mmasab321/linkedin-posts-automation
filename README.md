# LinkedIn Auto-Poster

Next.js app: generate LinkedIn drafts with Kimi 2.5 (Moonshot), approve & schedule via GetLate. 15 posts/month, 48h spacing, full queue on this platform.

## Deploy on Vercel

The app uses **PostgreSQL** (SQLite cannot run on Vercel’s serverless environment).

1. **Create a Postgres database**
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Dashboard → Storage → Create Database), or  
   - [Neon](https://neon.tech) (free tier), or any Postgres host.

2. **Environment variable**
   - In your Vercel project → **Settings → Environment Variables**, add **`DATABASE_URL`** with your Postgres connection string (e.g. `postgresql://user:pass@host:5432/dbname?sslmode=require`).

3. **Build command** (optional override)
   - `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`  
   - Or leave default; ensure **Build Command** includes `npx prisma generate` and `npx prisma migrate deploy` before `npm run build`.

4. After deploy, open **Settings** in the app and add your GetLate API Key, Moonshot API Key, and LinkedIn Account ID (they’re stored in the DB).

5. **Autopilot (optional):** In **Settings → Autopilot** you can enable hands-free posting. Add RSS or evergreen topics, set max auto-posts per month and validation strictness. The cron job at `/api/cron/autopilot` runs daily (e.g. 8 AM UTC via `vercel.json`). Set **`CRON_SECRET`** in Vercel env if you want to protect the cron endpoint; the cron caller must send `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret: <CRON_SECRET>`.

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
