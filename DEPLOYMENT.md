# Deployment guide

The production architecture is:

| Component | Host | Directory | Responsibility |
| --- | --- | --- | --- |
| React single-page app | Vercel | `client` | Browser interface |
| Express API | Render | `server` | Authentication, bookings, bidding and integrations |
| PostgreSQL database | Supabase | `server/schema.sql` | Persistent application data |

The React app never connects directly to Supabase. It calls the Render API, and only the trusted Render service receives the PostgreSQL credentials.

This deployment uses Supabase only as a managed PostgreSQL database. Authentication remains in the Express API, so the frontend does not need a Supabase URL, anon key, service-role key, or Supabase Auth configuration.

## Quick deployment checklist

1. Create a Supabase project and run `server/schema.sql`.
2. Deploy the `server` directory to Render with the database and application environment variables.
3. Confirm the API starts and connects to PostgreSQL.
4. Deploy the `client` directory to Vercel with the Render API URL.
5. Add the final Vercel origin to Render and redeploy the API.
6. Sign up the first user and promote it to administrator in Supabase.
7. Run the end-to-end smoke tests before enabling optional integrations.

## 1. Create the Supabase database

1. Create a Supabase project and choose a region close to the Render service.
2. Open **SQL Editor**, paste the complete contents of [`server/schema.sql`](server/schema.sql), and run it once.
3. Open the project's **Connect** panel and copy the **Session pooler** connection string. Session mode is suitable for the long-running Render server and works over IPv4. Use the exact host and username supplied by Supabase. See [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. Replace the password placeholder in the copied URI. Percent-encode reserved password characters such as `@`, `:`, `/`, `?`, `#`, and `%`.
5. In **Database Settings > SSL Configuration**, download the server root certificate. See [Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).

After running the schema, verify its tables in SQL Editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

The result should include `band_members`, `bands`, `bidding_windows`, `bids`, `bookings`, `email_otps`, `password_reset_otps`, `system_settings`, and `users`.

Encode the downloaded certificate into one line for Render:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\prod-supabase.cer'))
```

The schema enables Row Level Security without browser-facing policies. This intentionally blocks direct Data API access; the Express server continues to use its trusted PostgreSQL connection.

## 2. Configure and deploy the Render API

Create a Render **Web Service** connected to this repository:

- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`

Add these environment variables in Render:

```text
NODE_ENV=production
CLIENT_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=1h

DATABASE_URL=postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:5432/postgres
DB_POOL_MAX=10
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA_BASE64=the-single-line-base64-certificate

EMAIL_DEV_MODE=false
RESEND_API_KEY=...

ENABLE_GOOGLE_CALENDAR=false
ENABLE_TELEGRAMBOT=false
ENABLE_SCHEDULE_JOBS=false
RUN_AUTO_RELEASE_ON_START=false
APP_BASE_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Generate `JWT_SECRET` from at least 32 random bytes and never commit it. Keep Google Calendar, Telegram and scheduled jobs disabled until the core booking flow passes its smoke tests. Humidifier-photo features are intentionally disabled.

Deploy the service, then check:

```text
https://YOUR-RENDER-SERVICE.onrender.com/api/ping
```

The response should be `{"ok":true}`. Render logs should also contain `Connected to PostgreSQL database.`

The ping endpoint only proves that the Express process is responding. The PostgreSQL connection message in the logs is the separate database-readiness check.

## 3. Configure and deploy the Vercel client

1. Import the same repository into Vercel.
2. Set **Root Directory** to `client`; Vercel should detect Create React App.
3. Add the environment variable:

   ```text
   REACT_APP_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

4. Deploy. The included `client/vercel.json` handles client-side route rewrites.
5. Copy the final Vercel origin back into Render's `CLIENT_ORIGINS` and `APP_BASE_URL`, then redeploy the API.

For multiple permitted frontend origins, set `CLIENT_ORIGINS` to a comma-separated list of exact origins. Do not include paths or trailing slashes.

Vercel creates a separate URL for each preview deployment. Keep production restricted to the production origin unless preview deployments also need API access; if they do, add only the specific preview origins being tested.

## 4. Bootstrap the first administrator

There is no production data to migrate. Create the first account through the normal signup flow, then promote it from Supabase SQL Editor:

```sql
UPDATE users
SET role = 'admin',
    status = 'approved',
    is_mr_certified = TRUE
WHERE email = 'YOUR_NUS_EMAIL';
```

Verify that the statement updates exactly one row. Log out and log in again so the application loads the new role.

## 5. Smoke-test the deployment

1. Log in as the bootstrapped administrator.
2. Create and approve a normal test user.
3. Create a band and assign an approved leader.
4. Confirm the calendar exposes `07:00`, `09:00`, `11:00`, `13:00`, `15:00`, `17:00`, `19:00`, and `21:00` starts.
5. Submit three ranked band bids and run the allocation flow.
6. Create an individual booking and confirm duplicate confirmed bookings for the same slot are rejected.
7. Check Render logs for PostgreSQL, CORS, JWT or email errors.
8. Enable Google Calendar, Telegram and scheduled jobs one integration at a time, testing after each change.

## 6. Run a local preflight

Before deploying a revision, validate the API from the `server` directory:

```powershell
cd server
npm ci
npm test
npm start
```

Create `server/.env` from `server/.env.example` and supply a development database connection. When connecting locally to the remote Supabase database, use the Session pooler URI and set `DB_SSL=true`. Keep `.env` out of Git.

For a full local test, set the client's `REACT_APP_API_URL` to the local API origin, start the client separately, and exercise signup, login and booking creation.

## 7. Troubleshooting

| Symptom | Likely cause and action |
| --- | --- |
| `relation ... does not exist` | The Supabase schema was not run, was run against the wrong project, or failed partway through. Run the complete `server/schema.sql` in that project's SQL Editor and verify the table list above. |
| `ENOTFOUND`, `ETIMEDOUT`, or no database connection | Copy the exact **Session pooler** URI from Supabase. Do not substitute the direct database host, which may require IPv6. Check that the password is URL-encoded. |
| Certificate or `unable to verify` error | Download the correct Supabase root certificate again, base64-encode the certificate file without line breaks, and replace `DB_SSL_CA_BASE64`. Keep `DB_SSL=true` and `DB_SSL_REJECT_UNAUTHORIZED=true`. |
| API ping works but login or signup fails | The web process is healthy but its database or email dependency is not. Check Render for `Connected to PostgreSQL database.` and inspect the request error immediately following the failed action. |
| Browser reports a CORS error | Set `CLIENT_ORIGINS` to the exact Vercel origin, including `https://` but excluding paths and a trailing slash, then redeploy Render. |
| Authentication requests fail after deployment | Confirm that `JWT_SECRET` is present and unchanged across Render deployments. Existing sessions become invalid if the secret changes. |
| Signup email is not received | Check `RESEND_API_KEY`, the email configuration and Render logs. Use development email mode only for deliberate non-production testing. |
| The application worked previously but all database operations now fail | Check whether the Supabase Free Plan project is paused and resume it from the Supabase dashboard. |

## 8. Free-tier and production considerations

Supabase may pause an inactive Free Plan project. A paused database makes login, bookings and scheduled jobs unavailable until it is resumed. The Free Plan is suitable for development and demonstrations; use a paid plan when the club depends on the system being continuously available. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

The fresh Supabase schema already uses the 07:00–23:00 schedule. Do not run the old MySQL time-shift migration.

## 9. Ongoing deployment workflow

- Apply schema changes in a reviewed SQL migration before deploying API code that needs them.
- Deploy the API before frontend changes that depend on new API behaviour.
- Redeploy Vercel whenever `REACT_APP_API_URL` changes because Create React App embeds it at build time.
- Keep `CLIENT_ORIGINS` aligned with every active Vercel or custom-domain origin.
- Never expose `DATABASE_URL`, the database password, certificate, `JWT_SECRET`, or service credentials in the React client.
