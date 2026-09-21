# RTAFNC Adaptation Layer

Upstream base: ManageWithNoobItGuy/line-stock-bot (MIT).
The upstream code is vendored under this directory so the existing governance-supplies system remains untouched.

## Target use
ระบบเบิก-จ่ายอาภรณ์ภัณฑ์และพัสดุปกครอง วพอ. ผ่าน LINE + LIFF

## Preserve from upstream
- LINE webhook / signature verification
- chat parser and confirmation flow
- LIFF dashboard
- barcode / QR workflow
- multi-location inventory
- movement ledger
- low-stock alert
- negative-stock protection
- D1 persistence

## RTAFNC additions
- Student Master (7-digit student id)
- sizes / variants
- entitlement per academic year
- return and size exchange
- damaged / lost state
- RBAC
- audit log
- future sync adapter to existing `data.json` / Google Drive master

## Safety rule
This branch is STAGING ONLY. Do not write to the current production dataset.
