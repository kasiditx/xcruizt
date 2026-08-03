import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const resolution = await getCurrentAccountResolution();

  if (
    resolution.status !== "ready" ||
    !resolution.account.admin.isAdmin
  ) {
    return children;
  }

  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-main-content">
        ข้ามไปเนื้อหาหลัก
      </a>
      <AdminNavigation
        permissionCodes={resolution.account.admin.permissionCodes}
        roleNames={resolution.account.admin.roleNames}
      />
      <div className="admin-app__content" id="admin-main-content">
        {children}
      </div>
    </div>
  );
}
