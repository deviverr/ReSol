# ReSol

Secure, escrow-backed secondhand trading with strangers nearby.

ReSol is a mobile-first marketplace for local secondhand sales. Buyers reserve
items with USDC held in a Solana escrow program, then release funds after an
in-person QR/code handoff.

## What is inside

- `app/` - Next.js 16 frontend with wallet connection, listings, sales flow,
  activity, ratings, Vercel beta deployment, and GitHub Pages demo export.
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

Vercel is the canonical host for the devnet beta. The Next config builds as a
normal Vercel app by default. GitHub Pages remains available as a static demo
when `NEXT_PUBLIC_BASE_PATH=/ReSol` is set by the Pages workflow.

For the hosted beta to use real data, set these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_USDC_MINT`
- `NEXT_PUBLIC_TREASURY`

Do not set `NEXT_PUBLIC_BASE_PATH` on Vercel.

## Devnet beta checklist

1. Apply `supabase/migrations/*` to the hosted Supabase project.
2. Confirm Supabase Auth allows the Vercel URL in URL Configuration.
3. Confirm the `listing-photos` bucket exists and is public.
4. Set the Vercel environment variables above for production.
5. Run `pnpm lint`, `pnpm build`, `pnpm verify:devnet`, and
   `pnpm verify:supabase` from `app/`.
6. Test the release with two devnet wallets: create listing, upload photo,
   reserve, cancel, reserve again, release via QR/code, and rate the trade.

## Current validation

- `pnpm build` passes in `app/`.
