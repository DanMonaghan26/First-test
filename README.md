# Family Planner

A shared weekly planner for the whole family:

- **Everyone gets their own account** to add events and notes to their own calendar.
- **Admins** (e.g. parents) can add events to *any* family member's calendar.
- **Kitchen TV display**: a no-login, auto-refreshing, big-screen view of everyone's
  week that you open once in a Smart TV's web browser and leave open.
- Works well on iPhone/iPad — mobile-first layout, installable to the home screen.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- SQLite via [Prisma](https://www.prisma.io) — a single database file, no separate
  database server to run
- Tailwind CSS
- Custom cookie-based session auth (signed with [`jose`](https://github.com/panva/jose),
  passwords hashed with `bcryptjs`) — no third-party auth service required

## Getting started

```bash
npm install
cp .env.example .env        # then edit SESSION_SECRET (see below)
npx prisma migrate deploy   # creates dev.db and applies the schema
npm run dev
```

Open http://localhost:3000 — since there are no users yet, you'll land on a setup
page to create the first admin account. From there, sign in and go to **Admin** to
add the rest of the family.

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

## Deployment

This app needs a persistent filesystem for the SQLite database file (`dev.db`), so
it's a better fit for **always-on hosting** than typical serverless platforms:

- A home server, NAS, or Raspberry Pi on your home network (simplest — the TV and
  everyone's phones are already on the same network).
- Any VPS (a small droplet/instance is plenty for a family's worth of data).

Typical production run:

```bash
npm install
npx prisma migrate deploy
npm run build
npm start        # serves on port 3000 by default; use -p to change it
```

Set real environment variables (`DATABASE_URL`, `SESSION_SECRET`) rather than
relying on `.env` in production. By default the app assumes plain HTTP, which
is right for a typical home-LAN setup (the TV and phones just hit
`http://<local-ip>:3000`). If you put it behind HTTPS (a reverse proxy, or a
public deployment), set `COOKIE_SECURE=true` — otherwise login cookies won't
be marked secure even though they're sent over TLS.

To find the local network address to use on the TV and phones, check your
server/computer's LAN IP (e.g. `ipconfig getifaddr en0` on macOS, `hostname -I`
on Linux) and browse to `http://<that-ip>:3000`.

If you'd rather deploy to a serverless platform (e.g. Vercel), swap the SQLite
datasource for a hosted Postgres database — the Prisma schema
(`prisma/schema.prisma`) would need its `datasource` provider and the query
adapter in `src/lib/db.ts` updated accordingly.

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
