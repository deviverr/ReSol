# ReSol

Secure, escrow-backed secondhand trading with strangers nearby.

ReSol is a mobile-first marketplace for local secondhand sales. Buyers reserve
items with USDC held in a Solana escrow program, then release funds after an
in-person QR/code handoff.

## What is inside

- `app/` - Next.js 16 frontend with wallet connection, listings, sales flow,
  activity, ratings, and GitHub Pages static export support.
- `anchor/` - Anchor escrow program and tests.
- `supabase/` - Database migrations, storage setup, RLS policies, and seed data.

## Local frontend

```bash
cd app
pnpm install
pnpm dev
```

Copy `.env.example` to `app/.env.local` and fill in the Supabase values from
`supabase start` or your hosted Supabase project.

## Production build

```bash
cd app
pnpm build
```

The frontend is configured for `output: "export"` so it can deploy to GitHub
Pages. The repository workflow builds `app/out` and publishes it from `main`.

For the hosted app to use a real database, set these GitHub repository
variables before deployment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_USDC_MINT`
- `NEXT_PUBLIC_TREASURY`

## Current validation

- `pnpm build` passes in `app/`.
