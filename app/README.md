# ReSol Web App

Next.js frontend for the ReSol devnet beta.

## Local development

```bash
pnpm dev
```

Copy `../.env.example` to `.env.local` and fill in Supabase values for local or
hosted testing.

## Vercel beta

Vercel should use this `app/` directory as the project root. Set these
production environment variables and leave `NEXT_PUBLIC_BASE_PATH` unset:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_USDC_MINT`
- `NEXT_PUBLIC_TREASURY`

Checks before release:

```bash
pnpm lint
pnpm build
pnpm verify:devnet
pnpm verify:supabase
```

## GitHub Pages demo

The repository Pages workflow sets `NEXT_PUBLIC_BASE_PATH=/ReSol`, which turns
on static export and keeps the public demo URL working.
