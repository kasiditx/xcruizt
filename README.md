# XCRUIZT

Commerce platform สำหรับจำหน่าย ReShade presets ของ FiveM โดยให้ Website และ
PostgreSQL เป็น source of truth ของ Catalog, ราคา, Order, Payment,
Entitlement และ Download permission

## สถานะปัจจุบัน

โค้ดของ Commerce MVP ครบขอบเขต **Phase 0–5** แล้ว โดยไม่มีการ seed สินค้าหรือ
รายการซื้อปลอม ระบบจะแสดง empty state จนกว่า Admin จะสร้างและ Publish Catalog
จริง

### สิ่งที่ทำแล้วใน codebase

- Username + Password signup/login ผ่าน Supabase Auth โดยสมัครแล้วเข้าใช้งานได้
  ทันที และ Discord OAuth ใช้ flow เดียวกับ Customer/Admin
- Database-backed Role/Permission, protected Admin layout/actions/routes,
  action-level authorization, MFA gate และ Admin audit logs
- Collections, Products, SKUs, SKU-to-Product grants, Product Versions, Media,
  private Files และ Admin CRUD/publish workflow
- Homepage, Shop filters, Collection/Product pages, Cart, Account, Orders,
  Library และ responsive empty/loading/error states
- Server-authoritative quote/coupon calculation, immutable Order Item snapshots
  และ Stripe Checkout ที่จำกัด `payment_method_types` เป็น PromptPay
- Stripe raw-body signature verification, event deduplication, amount/currency/
  order validation และ atomic Payment + Order + Entitlement + Outbox fulfillment
- Private Cloudflare R2 upload/verify flow และ short-lived signed downloads ที่
  ตรวจ Session, customer status, ownership, version/file relationship,
  rate limit และบันทึก hashed security metadata
- Resend notification worker, QStash-signed jobs, retry policy และ Discord Bot
  role synchronization ที่ไม่ทำให้ Payment หรือ Library ล้มตาม provider
- Admin Operations สำหรับ Orders, Payments, Refunds, Customers, Entitlements,
  Coupons, Downloads, Webhooks, Discord jobs, Settings และ Audit Logs
- Turnstile, Upstash rate limits, Origin checks, RLS, CSP/security headers,
  structured redacted logging, Sentry และ Vercel Speed Insights
- Dynamic metadata/OG image, JSON-LD, sitemap, robots rules และ favicon
- GitHub Actions CI, Dependabot, production dependency audit และ
  [Operations Runbook](docs/OPERATIONS.md)
- Analytics event schema แบบ strict allowlist ที่ไม่ยอมรับ PII; ยังไม่ส่งไป
  PostHog จนกว่าจะมี Consent/Privacy policy และ configuration จริง

## ข้อเท็จจริงที่ยังต้องทำก่อนเปิด Production

โค้ดไม่สามารถยืนยัน provider หรือข้อมูลธุรกิจแทนเจ้าของระบบได้ รายการต่อไปนี้
เป็น launch gate ไม่ใช่ placeholder ที่ควรเดาใส่:

- กำหนด production domain, DNS, canonical URL และ Vercel project
- ใส่ secrets ผ่าน secret manager และตั้งค่า Supabase, Stripe PromptPay +
  webhook, private R2, Upstash/QStash, Resend, Turnstile, Sentry และ Discord
- สร้าง Catalog, Media และ Product packages จริงผ่าน Admin
- ทดสอบ staging PromptPay payment, webhook retry, entitlement, download,
  refund, Discord role และ email delivery ด้วย provider test mode
- ให้เจ้าของธุรกิจ/ที่ปรึกษากฎหมายอนุมัติ Terms, Privacy/Cookie Notice,
  Refund Policy, Digital License, retention และช่องทาง Contact จริง
- เปิด PostHog เฉพาะหลังอนุมัติ analytics consent/policy
- ตรวจ Search Console, Rich Results, Discord link preview, WAF/ZAP และ backup/
  rollback บน deployment จริง

`GET /api/ready` จะ fail closed ใน staging/production เมื่อ provider สำคัญตั้งค่า
ไม่ครบ โดยไม่เปิดเผยชื่อหรือค่าของ credential ใน public response

## หลักการที่ห้ามเปลี่ยน

- Browser ส่งได้เฉพาะ SKU, quantity และ coupon code; Server คำนวณราคาทุกครั้ง
- Success page หรือ Stripe redirect ไม่ใช่หลักฐานการชำระเงิน
- Fulfillment เริ่มจาก Stripe webhook ที่ verify แล้วเท่านั้น
- `Entitlement` เป็น authority ของ ownership; Discord role ไม่ใช่สิทธิ์ดาวน์โหลด
- Customer resources ต้อง scope ด้วย authenticated user เพื่อป้องกัน IDOR
- Admin UI visibility ไม่ใช่ authorization; ทุก mutation ตรวจ permission ฝั่ง
  Server และ operation สำคัญมี audit trail
- Provider side effects ต้อง retry ได้และห้าม rollback Payment ที่สำเร็จ
- ห้าม log password, token, PII, storage key, raw webhook หรือ signed URL เต็ม

## Tech stack

| Area | Technology |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, Lucide React, Server Components first |
| Validation | Zod |
| Database | Supabase PostgreSQL, Drizzle ORM, postgres-js |
| Authentication | Supabase Auth + SSR cookies |
| Payment | Stripe Checkout + PromptPay |
| Storage | Cloudflare R2 private bucket |
| Queue / rate limit | Upstash QStash, Redis, Ratelimit |
| Notification | Resend |
| Community | Discord OAuth + Bot roles |
| Observability | Sentry, Vercel Speed Insights, structured JSON logs |
| Quality | Vitest, ESLint, TypeScript, Lighthouse, GitHub Actions |
| Package manager | pnpm 11.9 |

โปรเจกต์ไม่ใช้ Material UI และไม่ควรเพิ่ม competing component library

## โครงสร้างหลัก

```text
src/
├── app/
│   ├── account/              # Customer profile, orders, Library, downloads, Discord
│   ├── admin/                # Protected Catalog และ Operations surfaces
│   ├── api/                  # Checkout, webhook, download, jobs และ Admin upload
│   ├── auth/                 # Password/Discord login, callback, profile completion
│   ├── cart/ checkout/       # Cart และ server-observed checkout states
│   ├── collections/ products/ shop/
│   ├── opengraph-image.tsx robots.ts sitemap.ts
│   └── layout.tsx
├── components/               # Store, Account และ Admin UI
├── db/
│   ├── schema/               # Identity, Commerce และ Operations schemas
│   ├── migrations/           # 0000–0007; review ก่อน apply
│   └── seeds/                # Idempotent authorization seeds
├── lib/
│   ├── analytics/ env/ http/ observability/ security/ supabase/
└── modules/
    ├── administration/ catalog/ checkout/ discord/
    ├── entitlements/ identity/ notifications/ payments/
    └── ...                   # domain/application/infrastructure boundaries
```

## เริ่มต้นใช้งาน

Requirements:

- Node.js `>=20.9.0` (CI ใช้ Node 24)
- pnpm `11.9.0`
- PostgreSQL/Supabase project สำหรับ flow ที่อ่านหรือเขียนข้อมูล

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Environment

ใช้ [.env.example](.env.example) เป็นรายการ canonical และเก็บค่าจริงใน local
secret file หรือ deployment secret manager เท่านั้น กลุ่มค่าที่ระบบใช้คือ:

- Application: `APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_MEDIA_ORIGIN`,
  `LOG_LEVEL`
- Supabase/PostgreSQL: public URL/key, `DATABASE_URL`, `DATABASE_DIRECT_URL`
- Stripe: secret key และ webhook secret
- R2: account/access keys, private bucket และ `PRIVACY_HASH_SECRET`
- Discord: OAuth client, Bot token และ Guild ID
- Resend: API key, sender และ reply-to
- Turnstile, Upstash Redis และ QStash credentials
- Sentry DSN, trace rate และ optional source-map upload credentials

`DATABASE_URL` ใช้ Transaction Pooler port 6543 พร้อมปิด prepared statements
ส่วน `DATABASE_DIRECT_URL` ใช้ Direct/Session Pooler port 5432 สำหรับ migration

Username Auth ใช้ internal non-deliverable email เป็น adapter ให้ Supabase Auth
โดยไม่เก็บ password/hash ใน application database ปัจจุบันยังไม่มี email password
recovery จึงต้องมี Discord หรือกระบวนการ Admin recovery ที่อนุมัติก่อนเปิดจริง

## Database

มี migration 8 ชุด (`0000`–`0007`) ครอบคลุม Identity/Admin, Catalog,
Commerce, Entitlements, Downloads, Operations, Outbox และ Discord queue พร้อม
RLS, constraints, unique/idempotency guards และ indexes

สร้าง migration แบบ offline:

```bash
pnpm db:generate --name=descriptive_migration_name
```

คำสั่งต่อไปนี้เปลี่ยน database ที่ชี้อยู่ ต้องตรวจ environment และได้รับอนุญาต
ก่อนรัน:

```bash
pnpm db:migrate
pnpm db:seed:authorization
```

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level high
```

หรือใช้ `pnpm check` เพื่อรัน lint, typecheck, tests และ build ตามลำดับ CI จะ
apply migrations กับ PostgreSQL service แยกก่อนรัน gates เหล่านี้

Browser/production smoke และขั้นตอน incident response อยู่ใน
[docs/OPERATIONS.md](docs/OPERATIONS.md)

## Verification ล่าสุด

ณ 31 กรกฎาคม 2026:

- production build สำเร็จและสร้าง 54 routes รวม static/dynamic metadata routes
- anonymous desktop/mobile smoke ผ่านที่ viewport 390×844 โดยไม่มี horizontal
  overflow; protected Account/Admin redirect ไป Login พร้อม validated `next`
- `/api/health` และ `/api/ready` ตอบ 200 ใน local; malicious Origin ถูกปฏิเสธ
  403; OG image และ icon ตอบ image content type ที่ถูกต้อง
- Lighthouse จาก local production server: Performance 94, Accessibility 100,
  Best Practices 100, CLS 0, console errors 0
- SEO score ของ local baseline เป็น 66 เพราะ non-production `robots.txt` block
  indexing โดยตั้งใจ; ต้องวัดซ้ำบน production domain
- ยังไม่อ้างว่า live Stripe/R2/Discord/Resend/QStash/Turnstile/Sentry ผ่านจนกว่า
  credentials และ provider-side configuration จะถูกทดสอบจริง

รายละเอียด requirement และ architecture อยู่ใน `CONTEXT.MD` (local project
context) และ Blueprint ต้นฉบับที่เจ้าของโปรเจกต์จัดเตรียม
