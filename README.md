# Family Planner

A shared weekly planner for the whole family:

- **Everyone gets their own account** to add events and notes to their own calendar.
- **Admins** (e.g. parents) can add events to *any* family member's calendar.
- **Kitchen TV display**: a no-login, auto-refreshing, big-screen view of everyone's
  week that you open once in a Smart TV's web browser and leave open.
- Works well on iPhone/iPad — mobile-first layout, installable to the home screen.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Postgres via [Prisma](https://www.prisma.io)
- Tailwind CSS
- Custom cookie-based session auth (signed with [`jose`](https://github.com/panva/jose),
  passwords hashed with `bcryptjs`) — no third-party auth service required

## Deploy it for free (recommended — no local install needed)

This is the easiest way to get a URL you can open from any device's browser,
with no Node install and nothing running on your own computer:

1. **Create a free Postgres database.** Sign up at
   [neon.com](https://neon.com) or [supabase.com](https://supabase.com) (both
   have a free tier, no credit card) and create a new project. Copy its
   connection string (it looks like `postgresql://user:password@host/dbname`).
2. **Deploy to Vercel.** Sign up at [vercel.com](https://vercel.com) (GitHub
   login works, no credit card), click **Add New → Project**, and import this
   GitHub repository.
3. Before the first deploy, open the project's **Environment Variables**
   settings and add:
   - `DATABASE_URL` — the connection string from step 1
   - `SESSION_SECRET` — any long random string (e.g. run `openssl rand -base64 32`
     locally, or use a password generator)
   - `COOKIE_SECURE` — `true` (Vercel serves everything over HTTPS)
4. Click **Deploy**. Vercel installs dependencies, applies the database schema
   (`prisma migrate deploy` runs as part of the build), and gives you a URL
   like `https://your-app.vercel.app`.
5. Open that URL on any device — phone, iPad, laptop, the kitchen TV — and
   you'll land on the setup page to create the first admin account.

Every time new commits land on this branch/PR, Vercel redeploys automatically.

## Running it locally instead

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate deploy
npm run dev
```

`DATABASE_URL` needs to point at a real Postgres database — either one you run
yourself, or the same free Neon/Supabase database from above. Open
http://localhost:3000 — since there are no users yet, you'll land on a setup
page to create the first admin account. From there, sign in and go to **Admin**
to add the rest of the family.

### Generating a real `SESSION_SECRET`

```bash
openssl rand -base64 32
```

Put the result in `.env` as `SESSION_SECRET`. Anyone with this value can forge
login sessions, so keep it private and use a different one in production than
in development.

## Using it day to day

- **`/week`** — sign in here on your phone or laptop. Add events/notes to your own
  calendar. Admins additionally get a "For" dropdown when adding an event, so they
  can add it to another family member's calendar. Everyone's events for the week
  are visible on this same page, color-coded per person.
- **`/admin`** — add/remove family members, reset passwords, and generate the TV
  display link. Only visible to admins.
- **`/tv/[token]`** — the kitchen TV view. Go to Admin → "Generate TV link", open
  the resulting URL once in the Samsung TV's built-in web browser, and leave the
  tab open. It has no login and refreshes itself every minute. Because it needs no
  sign-in, treat the link like a password — only open it on your home network, and
  regenerate/remove it from Admin if you ever think it's leaked.

## Self-hosting instead of Vercel

You can also run this on your own always-on machine (a home server, NAS, or
Raspberry Pi, or any VPS) instead of Vercel — the app itself doesn't care, it
just needs a `DATABASE_URL` pointing at a reachable Postgres (self-hosted or
still a free Neon/Supabase one):

```bash
npm install
npx prisma migrate deploy
npm run build
npm start        # serves on port 3000 by default; use -p to change it
```

Set real environment variables (`DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE`)
rather than relying on `.env` in production. Leave `COOKIE_SECURE=false` for a
plain-http home-LAN setup (the TV and phones just hit `http://<local-ip>:3000`);
set it to `true` only if this is reachable over HTTPS.

To find the local network address to use on the TV and phones, check your
server/computer's LAN IP (e.g. `ipconfig getifaddr en0` on macOS, `hostname -I`
on Linux) and browse to `http://<that-ip>:3000`.

## Project structure

```
prisma/schema.prisma        Database schema (User, Event, DisplayToken)
src/lib/                    Session auth, password hashing, date helpers, data access
src/lib/actions/            Sign-up/login/logout server actions
src/app/setup, src/app/login   First-run and sign-in pages
src/app/(dashboard)/week    Personal + whole-family weekly view
src/app/(dashboard)/admin   Family member management + TV link generation
src/app/tv/[token]          Kitchen TV kiosk display (no auth)
src/proxy.ts                Redirects signed-out users away from protected pages
```
