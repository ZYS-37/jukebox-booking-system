# Deployment guide

This application is deployed as two services:

| Component | Host | Directory | Responsibility |
| --- | --- | --- | --- |
| React single-page app | Vercel | `client` | The browser interface |
| Express API | Render | `server` | Authentication, bookings, bidding, MySQL, integrations and scheduled jobs |
| MySQL database | Managed MySQL provider | External | Persistent application data |

Deploy the API first, then point the Vercel app at its public URL.

## 1. Prepare production values

Before deploying, collect the production MySQL connection values and choose a strong random `JWT_SECRET` (at least 32 random bytes). Do not commit these values to Git.

The full list of supported server variables is in [`server/.env.example`](server/.env.example). For a first safe production deployment, set these on Render:

```text
NODE_ENV=production
CLIENT_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=1h

DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=jukebox

EMAIL_DEV_MODE=false
RESEND_API_KEY=...

ENABLE_GOOGLE_CALENDAR=false
ENABLE_TELEGRAMBOT=false
ENABLE_SCHEDULE_JOBS=false
RUN_AUTO_RELEASE_ON_START=false
```

Keep the optional Google Calendar, Telegram and scheduled-job flags off until the core booking flow has been tested. If you enable an integration later, add its corresponding credentials from the example file. Humidifier-photo uploads are intentionally disabled in the current build.

## 2. Deploy the API to Render

1. Push the project to a Git provider and create a new **Web Service** in Render.
2. Connect the repository and set **Root Directory** to `server`.
3. Use build command `npm install` and start command `npm start`.
4. Add the environment variables above in Render's Environment page.
5. Deploy and copy the service's public HTTPS URL, for example `https://jukebox-api.onrender.com`.

Check the health endpoint in a browser:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/health
```

It should return a JSON health response. Do not test protected booking endpoints until a user has logged in and received a fresh session.

## 3. Deploy the client to Vercel

1. Import the same repository into Vercel.
2. Set **Root Directory** to `client`. Vercel should detect Create React App.
3. Set `REACT_APP_API_URL` to the Render HTTPS URL, without a trailing slash:

   ```text
   REACT_APP_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

4. Deploy. The included `client/vercel.json` rewrites SPA routes to `index.html`.
5. Copy the Vercel production URL and update Render's `CLIENT_ORIGINS` to that exact origin. Redeploy Render after changing it.

If you add a custom domain, add that exact `https://` origin to `CLIENT_ORIGINS` as well. For multiple approved frontend origins, use a comma-separated list.

## 4. Smoke-test the production deployment

After both deployments are live:

1. Open the Vercel URL and log in. Existing local/browser sessions must log in again after the JWT change.
2. Confirm the dashboard and calendar load without browser CORS errors.
3. Create a test individual booking at 07:00 and a test band bid at 07:00.
4. Confirm the available slots are `07:00`, `09:00`, `11:00`, `13:00`, `15:00`, `17:00`, `19:00`, and `21:00`.
5. Confirm a request using the former `08:00` slot is rejected.
6. If Calendar integration is enabled, verify the resulting event has the expected start and end times.

Keep `ENABLE_SCHEDULE_JOBS=false` during this first test to avoid background actions while validating the deployment.

## 5. Migrate existing future bookings

New requests use the new schedule immediately. Existing records are **not** changed by deployment. After the smoke tests pass:

1. Back up the production database.
2. Open [`server/migrations/shift_future_slot_times_earlier_one_hour.sql`](server/migrations/shift_future_slot_times_earlier_one_hour.sql).
3. Replace `YYYY-MM-DD` with the first date whose future bookings should move one hour earlier.
4. Run the two preview `SELECT` statements against production and review the affected bookings and bids.
5. Run the transaction once during a maintenance window.
6. Update or recreate the corresponding existing Google Calendar events, if any. The migration marks affected synced bookings for resynchronization but does not alter Google Calendar directly.

Do not run this migration before the deployed application has passed the smoke tests. It changes production booking times and should only be run once.

## 6. Ongoing deployment workflow

- Deploy the API before frontend changes that depend on new API behavior.
- For each frontend deployment, Vercel embeds `REACT_APP_API_URL` at build time; redeploy when it changes.
- For each API deployment, keep `CLIENT_ORIGINS` aligned with active Vercel/custom-domain origins.
- Watch Render logs after release for database, CORS, JWT, or integration errors.
- Never store `.env` files, database passwords, API keys, service-account keys, or `JWT_SECRET` in the repository.
