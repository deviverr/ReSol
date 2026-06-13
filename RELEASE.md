# ReSol Devnet Beta Release

This release targets Vercel with real hosted Supabase data and devnet Solana
escrow. GitHub Pages remains a static demo only.

## Required environment

Set these in Vercel production for the `app/` project:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=BJbjgczJvjSb4GXPcjDWLPUQdfKRe7SFPCXQqZLcsrBw
NEXT_PUBLIC_USDC_MINT=B3rGdGRvZjkP1N2BJiRqyeQAm9sCeeP1vbkwzQcWSnSD
NEXT_PUBLIC_TREASURY=FvSfLTD5HQGCJa89WP3UzMFrBM12vavjKdvH4iQeizBb
```

Do not set `NEXT_PUBLIC_BASE_PATH` on Vercel.

## Supabase

Apply the SQL in `supabase/migrations/` to the hosted project, then verify:

```bash
cd app
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
pnpm verify:supabase
```

In Supabase Auth URL Configuration, add the Vercel production URL. Confirm the
`listing-photos` bucket is public and authenticated uploads are allowed.

## Deploy

```bash
cd app
pnpm lint
pnpm build
pnpm verify:devnet
npx vercel --prod
```

After deploy, open the Vercel URL and smoke test with two devnet wallets:

1. Create a listing with a photo.
2. Reserve it from a second wallet.
3. Cancel the reservation.
4. Reserve it again.
5. Complete the trade by scanning the buyer QR/code.
6. Rate the completed trade.

The beta is not mainnet-ready until the program, treasury, and release flow have
had a mainnet launch review.
