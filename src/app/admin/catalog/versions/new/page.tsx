import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminProducts } from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";
import { createVersionAction } from "../actions";
import { VersionForm } from "../version-form";

export default async function NewVersionPage() {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const products = await listAdminProducts();

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell admin-editor">
        <AdminBreadcrumbs
          items={[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/catalog/versions", label: "Versions" },
            { label: "สร้างใหม่" },
          ]}
        />
        <p className="section-kicker">ADMIN / CATALOG / VERSIONS</p>
        <h1>New Version</h1>
        <p>
          Version ใหม่เริ่มเป็น Draft เสมอเพื่อป้องกัน Library
          ชี้ไปยังไฟล์ที่ยังไม่พร้อม
        </p>
        <VersionForm
          action={createVersionAction}
          cancelHref="/admin/catalog/versions"
          products={products}
        />
      </section>
    </main>
  );
}
