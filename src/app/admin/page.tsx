import {
  Activity,
  BadgeDollarSign,
  Boxes,
  Cable,
  KeyRound,
  LibraryBig,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Tags,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { getAdminDashboardSummary } from "@/modules/administration/infrastructure/dashboard-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";
import { requireAdminMfa } from "@/modules/identity/infrastructure/admin-mfa";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  title: "Admin",
  description: "ศูนย์ควบคุมระบบ XCRUIZT",
  robots: {
    index: false,
    follow: false,
  },
};

const permissionLabels = {
  [ADMIN_PERMISSIONS.writeProduct]: "จัดการ Product และ Catalog",
  [ADMIN_PERMISSIONS.publishVersion]: "Publish Product Version",
  [ADMIN_PERMISSIONS.readOrders]: "ตรวจสอบ Orders",
  [ADMIN_PERMISSIONS.refundPayment]: "ดำเนินการ Refund",
  [ADMIN_PERMISSIONS.grantEntitlement]: "Grant และ Revoke Entitlement",
  [ADMIN_PERMISSIONS.manageDiscordSync]: "Retry Discord Role Sync",
  [ADMIN_PERMISSIONS.writeDiscordMapping]: "จัดการ Discord Role Mapping",
  [ADMIN_PERMISSIONS.writeCoupon]: "จัดการ Coupon",
  [ADMIN_PERMISSIONS.manageAdminRoles]: "จัดการ Admin Roles",
} as const;

export default async function AdminPage() {
  const resolution = await getCurrentAccountResolution();

  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/admin");
  }

  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/admin");
  }

  if (!resolution.account.admin.isAdmin) {
    notFound();
  }

  await requireAdminMfa("/admin");

  const summary = await getAdminDashboardSummary();
  const metrics = [
    {
      label: "Products",
      value: summary.products,
      detail: `${summary.skus} active/draft SKUs`,
      icon: Boxes,
    },
    {
      label: "Orders",
      value: summary.orders,
      detail: `${summary.payments} payment records`,
      icon: ReceiptText,
    },
    {
      label: "Entitlements",
      value: summary.activeEntitlements,
      detail: "Active customer ownership",
      icon: PackageCheck,
    },
    {
      label: "Webhook failures",
      value: summary.failedWebhooks,
      detail: "Requires reconciliation",
      icon: Activity,
    },
    {
      label: "Outbox queue",
      value: summary.queuedOutboxEvents,
      detail: "Pending or failed events",
      icon: Cable,
    },
    {
      label: "Discord queue",
      value: summary.queuedDiscordJobs,
      detail: "Pending or failed sync jobs",
      icon: LibraryBig,
    },
  ] as const;

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={resolution} />
      </header>

      <section className="admin-shell" aria-labelledby="admin-title">
        <div className="admin-heading">
          <div>
            <p className="section-kicker">ADMIN / CONTROL CENTER</p>
            <h1 id="admin-title">Operations</h1>
          </div>
          <div className="admin-role" aria-label="บทบาทผู้ดูแล">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{resolution.account.admin.roleNames.join(" · ")}</span>
          </div>
        </div>

        <div className="admin-metrics" aria-label="ภาพรวมระบบ">
          {metrics.map(({ detail, icon: Icon, label, value }) => (
            <article className="admin-metric" key={label}>
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
              <p>{label}</p>
              <strong>{value.toLocaleString("th-TH")}</strong>
              <span>{detail}</span>
            </article>
          ))}
        </div>

        <div className="admin-sections">
          <section aria-labelledby="admin-permissions-title">
            <div className="admin-section-heading">
              <KeyRound aria-hidden="true" size={19} />
              <h2 id="admin-permissions-title">สิทธิ์ของบัญชีนี้</h2>
            </div>
            <ul className="admin-permission-list">
              {resolution.account.admin.permissionCodes.map(
                (permissionCode) => (
                  <li key={permissionCode}>
                    <span>{permissionLabels[permissionCode]}</span>
                    <code>{permissionCode}</code>
                  </li>
                ),
              )}
            </ul>
          </section>

          <aside className="admin-readiness" aria-labelledby="readiness-title">
            <div className="admin-section-heading">
              <BadgeDollarSign aria-hidden="true" size={19} />
              <h2 id="readiness-title">Commerce readiness</h2>
            </div>
            <p>
              Catalog, Stripe PromptPay, Private R2 และ Operations UI
              พร้อมใช้งานตาม credential ที่ตั้งค่าไว้ ตรวจ failed queue
              ก่อนเปิดขายจริงเสมอ
            </p>
            <div className="admin-readiness__links">
              <Link
                className="admin-readiness__link"
                href="/admin/catalog/collections"
              >
                <Tags aria-hidden="true" size={17} />
                <span>Collections</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/catalog/products"
              >
                <Boxes aria-hidden="true" size={17} />
                <span>Products</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/catalog/skus"
              >
                <PackageCheck aria-hidden="true" size={17} />
                <span>SKUs</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/catalog/versions"
              >
                <LibraryBig aria-hidden="true" size={17} />
                <span>Versions</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/orders"
              >
                <ReceiptText aria-hidden="true" size={17} />
                <span>Orders</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/webhooks"
              >
                <Activity aria-hidden="true" size={17} />
                <span>Webhooks</span>
              </Link>
              <Link
                className="admin-readiness__link"
                href="/admin/mfa"
              >
                <ShieldCheck aria-hidden="true" size={17} />
                <span>Admin MFA</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
