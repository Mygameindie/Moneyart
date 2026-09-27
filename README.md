# MoneyArt

A Pixiv-style art community with a built-in messenger. Artists post any type of
art (images render inline, everything else is a downloadable file), buyers
browse and like, and everyone can chat 1:1 in real time. Artists add their own
PayPal / QR code / bank details so buyers can pay them **directly** — MoneyArt
never touches the money, so sellers keep 100% of what they receive.

## Features

- **Accounts** — email/password via Supabase Auth.
- **Gallery / feed** — upload any file type; browse, filter by tag, like
  artwork.
- **Profiles** — avatar, bio, public gallery, and public payment info.
- **Messenger** — real-time 1:1 chat via Supabase Realtime (Postgres change
  streaming, gated by Row Level Security) — new messages land in the other
  person's browser without a refresh. Reachable from any artwork or profile
  via "Message".
- **Get paid directly** — each artist manages their own PayPal email/link, a
  QR code image, and/or a bank account number from Settings; it's shown on
  their profile and every artwork page.

## Stack

Next.js 14 (App Router) + TypeScript, Tailwind CSS, and Supabase for
everything backend: Postgres (with Row Level Security policies as the only
authorization layer), Auth, Storage, and Realtime. There is no custom
server or REST API — pages talk to Supabase directly from the browser via
`@supabase/supabase-js`, which is what makes this deployable as a plain
serverless Next.js app (e.g. on Vercel) with no long-running process needed
for chat.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project's URL + anon/publishable key
npm run dev            # http://localhost:3000
```

The database schema, RLS policies, storage bucket, and realtime publication
live in this project's Supabase instance (managed via SQL migrations, not
checked into this repo as Prisma was). To point this app at a different
Supabase project, recreate:
- `profiles`, `artworks`, `likes`, `payment_methods`, `conversations`,
  `conversation_participants`, `messages` tables with RLS enabled.
- The `handle_new_user` trigger (auto-creates a `profiles` row on sign-up).
- The `get_or_create_conversation` and `list_my_conversations` RPC
  functions used by `src/lib/data.ts`.
- A public `uploads` storage bucket, namespaced by `${user_id}/...`.
- `messages` added to the `supabase_realtime` publication.

## Notes / next steps

- All authorization is enforced by Postgres RLS policies, not application
  code — the browser talks to Supabase directly with the publishable
  (anon) key. Read `src/lib/data.ts` alongside the SQL above before
  changing either.
- New sign-ups require confirming their email (Supabase Auth's secure
  default) before they can log in.
- Login is by email + password (Supabase Auth doesn't support "username or
  email" out of the box); username is still shown everywhere else.
- Payment methods are informational only (PayPal email/link, QR image, bank
  details) — there's no in-app payment processing, by design, so sellers get
  100% of what buyers send them.
