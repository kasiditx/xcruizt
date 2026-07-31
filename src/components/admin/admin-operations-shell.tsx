import type { ReactNode } from "react";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import type { CurrentAccount } from "@/modules/identity/application/current-account";

const operationLinks = [
  ["Orders", "/admin/orders"],
  ["Payments", "/admin/payments"],
  ["Customers", "/admin/customers"],
  ["Entitlements", "/admin/entitlements"],
  ["Refunds", "/admin/refunds"],
  ["Downloads", "/admin/downloads"],
  ["Webhooks", "/admin/webhooks"],
  ["Audit logs", "/admin/audit-logs"],
] as const;

export function AdminOperationsShell({
  account,
  children,
  description,
  title,
}: {
  account: CurrentAccount;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / OPERATIONS</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <Link className="admin-inline-action" href="/admin">
            Dashboard
          </Link>
        </div>
        <nav aria-label="Admin operations" className="admin-operation-nav">
          {operationLinks.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
          {account.admin.permissionCodes.includes("admin.roles.manage") ? (
            <Link href="/admin/settings">Admin roles</Link>
          ) : null}
          {account.admin.permissionCodes.includes("discord.sync.manage") ? (
            <Link href="/admin/discord">Discord</Link>
          ) : null}
          {account.admin.permissionCodes.includes("pricing.coupon.write") ? (
            <Link href="/admin/coupons">Coupons</Link>
          ) : null}
          <Link href="/admin/mfa">MFA</Link>
        </nav>
        {children}
      </section>
    </main>
  );
}
