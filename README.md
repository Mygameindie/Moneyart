# MoneyArt

A Pixiv-style art community with a built-in messenger. Artists post any type of
art (images render inline, everything else is a downloadable file), buyers
browse and like, and everyone can chat 1:1 in real time. Artists add their own
PayPal / QR code / bank details so buyers can pay them **directly** — MoneyArt
never touches the money, so sellers keep 100% of what they receive.

## Features

- **Accounts** — register/login with username or email, JWT session in an
  httpOnly cookie.
- **Gallery / feed** — upload any file type; browse, filter by tag, like
  artwork.
- **Profiles** — avatar, bio, public gallery, and public payment info.
- **Messenger** — real-time 1:1 chat (Socket.IO) with conversation list and
  unread indicators, reachable from any artwork or profile via "Message".
- **Get paid directly** — each artist manages their own PayPal email/link, a
  QR code image, and/or a bank account number from Settings; it's shown on
  their profile and every artwork page.

## Stack

Next.js 14 (App Router) + TypeScript, Tailwind CSS, Prisma + SQLite,
Socket.IO (via a small custom `server.js`), JWT auth with `jsonwebtoken` +
`bcryptjs`.

## Getting started

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET
npx prisma migrate dev    # creates prisma/dev.db
npm run dev               # http://localhost:3000
```

## Notes / next steps

- SQLite is used for zero-setup local dev; swap `DATABASE_URL` in `.env` (and
  the `provider` in `prisma/schema.prisma`) for Postgres/MySQL in production.
- Uploaded files are written to `public/uploads`. For production, point
  `saveUploadedFile` (in `src/lib/uploads.ts`) at object storage (S3, R2, …)
  instead of local disk.
- Auth/route protection is currently client-side (pages redirect to `/login`
  if not authenticated); add server-side middleware if you need pages to be
  non-renderable to logged-out users.
- Payment methods are informational only (PayPal email/link, QR image, bank
  details) — there's no in-app payment processing, by design, so sellers get
  100% of what buyers send them.
