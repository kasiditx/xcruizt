import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountControls } from "@/components/account/account-controls";
import { env } from "@/lib/env/server";
import { resolveAdminMfaNextPath } from "@/modules/identity/application/admin-mfa-policy";
import { getAdminMfaState } from "@/modules/identity/infrastructure/admin-mfa";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

import { AdminMfaPanel } from "./admin-mfa-panel";

export const metadata: Metadata = {
  description: "ตั้งค่าและยืนยัน TOTP สำหรับ XCRUIZT Admin",
  title: "Admin MFA",
};

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [resolution, query] = await Promise.all([
    getCurrentAccountResolution(),
    searchParams,
  ]);
  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/admin/mfa");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/admin/mfa");
  }
  if (!resolution.account.admin.isAdmin) notFound();

  const nextPath = resolveAdminMfaNextPath(query.next);
  const state = await getAdminMfaState();
  if (state.currentLevel === "aal2") redirect(nextPath);

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={resolution} />
      </header>
      <section className="admin-shell admin-mfa-shell">
        <AdminMfaPanel
          enforced={env.APP_ENV !== "local"}
          hasUnverifiedTotp={state.hasUnverifiedTotp}
          nextPath={nextPath}
          verifiedTotpFactorId={state.verifiedTotpFactorId}
        />
      </section>
    </main>
  );
}
