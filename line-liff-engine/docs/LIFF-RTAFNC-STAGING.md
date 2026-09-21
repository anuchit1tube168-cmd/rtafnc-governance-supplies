# RTAFNC LIFF Staging Setup

## Status
- Branch: `staging-liff-uniform-v1`
- Production write: **disabled**
- Runtime: Cloudflare Worker + D1 + static LIFF UI
- LINE webhook path: `/line/webhook`
- Health check: `/healthz`
- LIFF entry URL: Worker root URL (static `public/index.html`)

## LINE Developers values to create
1. Messaging API Channel (staging)
2. Channel secret
3. Long-lived channel access token
4. LIFF app under the same provider
5. LIFF size: Full
6. LIFF endpoint URL: `https://<staging-worker-domain>/`
7. Scope: `profile` and `openid`
8. Add the generated LIFF ID to Cloudflare secret/vars

Never commit real tokens or channel secrets.

## Cloudflare staging
Create D1 named `rtafnc-governance-liff-staging`, replace the placeholder database id in
`wrangler.rtafnc.jsonc`, then run migrations in order:

```bash
npx wrangler d1 migrations apply rtafnc-governance-liff-staging --remote --config wrangler.rtafnc.jsonc
```

Secrets:

```bash
npx wrangler secret put LINE_CHANNEL_SECRET --config wrangler.rtafnc.jsonc
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN --config wrangler.rtafnc.jsonc
npx wrangler secret put LIFF_ID --config wrangler.rtafnc.jsonc
```

Deploy staging:

```bash
npx wrangler deploy --config wrangler.rtafnc.jsonc
```

Then set LINE webhook URL:
`https://<staging-worker-domain>/line/webhook`

## RTAFNC extension
Migration `0002_rtafnc_uniform.sql` prepares:
- personnel / 7-digit student id
- LINE identity binding
- role model: admin, storekeeper, auditor, student, viewer
- item size / color / variant / barcode
- per-person annual entitlement
- issue / receive / return / exchange / damaged / lost
- immutable-style transaction history
- audit log

## Go-live gate
Do not enable production writes until:
- server-side LINE token/profile verification passes
- RBAC tests pass
- no-negative-stock tests pass
- return/exchange tests pass
- entitlement tests pass
- backup/export path is verified
- production D1 is separate from staging
