# LIFF STAGING — RTAFNC Governance Supplies

Branch: `staging-liff-uniform-v1`  
State: READY FOR LINE/LIFF CREDENTIAL BINDING  
Production write: **FALSE**

## Added
- Upstream LINE stock engine source under `line-liff-engine/`
- LINE webhook + signature verification
- LIFF dashboard + barcode/QR workflow
- Cloudflare Worker + D1 base migration
- RTAFNC uniform extension migration
- Student Master / 7-digit student id
- item size/variant
- annual entitlement
- return / exchange / damaged / lost transaction model
- RBAC role fields and audit log
- staging Wrangler config
- safe env template with no real secrets

## Waiting values
- Cloudflare staging D1 database id
- staging Worker domain
- LINE Channel Secret
- LINE Channel Access Token
- LIFF ID

## Endpoints after deploy
- LIFF: `https://<worker-domain>/`
- LINE webhook: `https://<worker-domain>/line/webhook`
- Health: `https://<worker-domain>/healthz`

Do not merge to production until RBAC, LINE server-side verification, entitlement,
return/exchange and negative-stock tests pass.
