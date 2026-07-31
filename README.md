# XCRUIZT

แพลตฟอร์ม commerce สำหรับจำหน่าย ReShade presets ของ FiveM โดยออกแบบให้
catalog, payment, product ownership และ download permission มี source of truth
ที่ตรวจสอบได้ฝั่ง Server

## สถานะโปรเจกต์

โปรเจกต์อยู่ใน **Phase 0: Foundation**

### พร้อมใช้งานใน codebase ปัจจุบัน

- Next.js 16 App Router, React 19 และ TypeScript
- หน้า Landing และ Login/Signup ด้วย Username + Password
- Discord OAuth action, PKCE callback และหน้าเลือก Username หลัง OAuth
- Supabase SSR browser/server clients, cookie session refresh และ Auth callback
- Tailwind CSS v4 พร้อม XCRUIZT design tokens
- Typed environment validation ด้วย Zod
- Live Supabase PostgreSQL connection
- Drizzle schema และ migrations ครบ 26 tables ตาม Commerce Blueprint
- RLS, owner policies, foreign keys, indexes และ integrity constraints
- Protected Customer Library shell และ Sign out
- Admin permissions, roles และ role mappings แบบ idempotent
- Admin audit log foundation และ audited Super Admin bootstrap
- Domain policy สำหรับ Admin permissions
- Error, loading และ not-found boundaries
- ESLint, TypeScript, Vitest และ production build checks

### วางแผนไว้ หรือยังไม่ผ่าน live verification

- Cloudflare Turnstile สำหรับ Login/Signup abuse protection
- Discord OAuth provider configuration
- Stripe Checkout ผ่าน PromptPay
- Payment webhook และ idempotent fulfillment
- Entitlement grant/revoke workflow และ private downloads ผ่าน Cloudflare R2
- Admin operations, audit logs และ refunds
- Resend, Discord, Upstash Redis และ QStash
- Production observability

> Username signup และ password login ผ่าน live end-to-end verification แล้ว:
> สมัครสำเร็จได้ session และเข้า Library ทันที จากนั้น sign out และ sign in
> กลับด้วยบัญชีเดิมได้ บัญชีทดสอบถูกล้างแล้ว Discord provider ยัง Disabled
> เพราะยังไม่มี Discord Client ID/Secret ส่วนข้อความเกี่ยวกับ checkout และ
> Library ยังไม่ใช่หลักฐานว่า payment หรือ entitlement integration ทำงานแล้ว

## หลักการสำคัญ

- Server เป็นผู้ตัดสินราคา ส่วนลด currency และยอดชำระ
- Redirect หรือ success page ห้ามใช้เป็นหลักฐานการชำระเงิน
- Fulfillment เริ่มจาก Stripe webhook ที่ตรวจ signature และ payment state แล้ว
- `Entitlement` เป็น authority ของ product ownership
- Admin authorization ต้องตรวจจาก database-backed permissions ฝั่ง Server
- Product files ต้องเป็น private และดาวน์โหลดผ่าน short-lived signed URL
- Provider side effects ต้อง retry ได้ โดยไม่ทำให้ payment transaction เสีย

## Tech stack

| Area | Technology |
| --- | --- |
| Web | Next.js 16, React 19, App Router |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| Validation | Zod 4 |
| Database | PostgreSQL, Drizzle ORM, postgres-js |
| Authentication | Supabase Auth, `@supabase/ssr` |
| Icons | Lucide React |
| Testing | Vitest 4 |
| Quality | ESLint 9, TypeScript compiler, Next.js production build |
| Package manager | pnpm 11.9 |

Stripe, Cloudflare R2, Upstash, QStash, Resend และ Discord เป็น planned
integrations ยังไม่ใช่ installed runtime dependencies ใน foundation ปัจจุบัน

## โครงสร้างโปรเจกต์

```text
src/
├── app/
│   ├── auth/login/          # Username/Password และ Discord login
│   ├── auth/callback/       # Supabase PKCE callback
│   ├── auth/complete-profile/ # ตั้ง Username หลัง Discord OAuth
│   ├── auth/error/          # Safe Auth failure page
│   ├── account/library/     # Protected customer Library shell
│   ├── error.tsx            # Route error boundary
│   ├── loading.tsx          # Global loading state
│   ├── not-found.tsx        # Not-found page
│   ├── layout.tsx           # Root layout และ metadata
│   ├── page.tsx             # Storefront landing page
│   └── globals.css          # Design tokens และ global styles
├── lib/
│   ├── env/                 # Typed environment schema และ server access
│   └── supabase/            # Browser/server clients และ session refresh
├── db/
│   ├── schema/              # Drizzle schema แยก Identity/Catalog/Commerce/Operations
│   ├── migrations/          # Generated SQL; review ก่อน apply
│   ├── seeds/               # Idempotent Admin permission seed
│   └── client.ts            # Server-only Transaction Pooler client
└── modules/
    └── identity/
        ├── application/     # Auth credentials, profile และ redirect policies
        ├── infrastructure/  # Supabase/Drizzle identity adapters
        └── domain/          # Admin permission policy
```

## เริ่มต้นใช้งาน

### Requirements

- Node.js `>=20.9.0`
- pnpm `11.9.0`

### Local development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Environment variables

Core environment ที่ code ปัจจุบัน validate:

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ENV` | `local` | `local`, `preview`, `staging` หรือ `production` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base URL; production ต้องใช้ HTTPS |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` หรือ `error` |
| `NEXT_PUBLIC_SUPABASE_URL` | ไม่มี | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ไม่มี | Browser-safe publishable key |
| `DATABASE_URL` | ไม่มี | Runtime Transaction Pooler URL, port `6543` |
| `DATABASE_DIRECT_URL` | ไม่มี | Migration Direct/Session Pooler URL, port `5432` |

`DATABASE_URL` ใช้กับ application runtime และปิด prepared statements เพื่อ
รองรับ Transaction Pooler ส่วน `DATABASE_DIRECT_URL` สงวนไว้สำหรับ migration
เท่านั้น

Auth ใช้ publishable key ทั้ง Browser และ Server SSR client ไม่ใช้
`SUPABASE_SERVICE_ROLE_KEY` ในการยืนยันตัวตนหรือ authorization ของผู้ใช้

Password Auth ใช้ internal non-deliverable email เป็น adapter ระหว่าง
Username กับ Supabase Auth เท่านั้น ระบบไม่แสดง identifier นี้ต่อผู้ใช้และไม่
เก็บ password/password hash ใน application database การกู้บัญชีผ่าน email
ยังไม่รองรับ; ต้องเพิ่ม verified email linking หรือใช้งาน Discord/Admin
recovery ก่อนเปิด production

## Database development

สร้างและตรวจ SQL migration แบบ offline:

```bash
pnpm db:generate --name=descriptive_migration_name
```

คำสั่งต่อไปนี้เปลี่ยน database ที่กำหนดไว้ จึงห้ามรันโดยไม่ได้รับอนุญาต:

```bash
pnpm db:migrate
pnpm db:seed:permissions
```

Migrations ปัจจุบันทั้ง 5 รายการถูก apply เข้า Supabase แล้ว ฐานข้อมูลมีครบ
26 tables ตาม Blueprint: Identity/Admin 6 tables และ Commerce domains อีก
20 tables ทุก public table เปิด RLS, sensitive operational tables ไม่มี
client policy และ authenticated user อ่านได้เฉพาะ `profiles`, `orders`,
`order_items` และ `entitlements` ที่เป็นของตนเอง ส่วน Review เปิดอ่านเฉพาะ
รายการที่ Publish หรือรายการของเจ้าของ

Migration ล่าสุดเพิ่ม Catalog, SKU/Product grants, Product Versions, private
file metadata, images, Orders, Payments, Refunds, Entitlements, Downloads,
Coupons, Webhooks, Outbox, Discord sync และ Reviews พร้อม foreign keys,
worker/query indexes, monetary checks, case-insensitive Coupon uniqueness,
Webhook idempotency และ partial unique active Entitlement

ห้าม commit secret, password, token, private key หรือ production connection
string

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | รัน development server |
| `pnpm build` | สร้าง production build |
| `pnpm start` | รัน production server หลัง build |
| `pnpm lint` | ตรวจ ESLint โดยไม่ยอมรับ warning |
| `pnpm lint:fix` | แก้ ESLint issues ที่แก้อัตโนมัติได้ |
| `pnpm typecheck` | ตรวจ TypeScript ด้วย `tsc --noEmit` |
| `pnpm test` | รัน Vitest ครั้งเดียว |
| `pnpm test:watch` | รัน Vitest watch mode |
| `pnpm db:generate --name=<name>` | สร้าง SQL migration จาก Drizzle schema |
| `pnpm db:migrate` | Apply migration ด้วย `DATABASE_DIRECT_URL` |
| `pnpm db:seed:permissions` | Seed Admin permission codes แบบ idempotent |
| `pnpm db:seed:authorization` | Seed permissions, roles และ mappings แบบ idempotent |
| `pnpm check` | รัน lint, typecheck, test และ build ตามลำดับ |

## Verification

รัน full local gate:

```bash
pnpm check
```

หรือรันแยกตาม scope:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Delivery roadmap

1. **Foundation**: environment, authentication base, database, permissions และ
   CI gates
2. **Catalog**: collections, products, SKUs, media, versions และ SEO
3. **Checkout**: cart validation, orders, Stripe PromptPay และ fulfillment
4. **Ownership**: Library, Entitlements, private files และ signed downloads
5. **Integrations**: notifications, Discord และ retryable jobs
6. **Operations**: Admin tools, audit, observability, security และ performance

แต่ละ phase ต้องมี tests และ verification ที่เหมาะกับความเสี่ยงก่อนถือว่า
พร้อมใช้งาน
