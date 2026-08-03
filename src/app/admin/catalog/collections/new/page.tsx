import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { createCollectionAction } from "../actions";
import { CollectionForm } from "../collection-form";

export const metadata: Metadata = {
  title: "New Collection",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCollectionPage() {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls
          resolution={{ account, status: "ready" }}
        />
      </header>
      <section className="admin-shell admin-editor">
        <AdminBreadcrumbs
          items={[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/catalog/collections", label: "Collections" },
            { label: "สร้างใหม่" },
          ]}
        />
        <p className="section-kicker">ADMIN / CATALOG / COLLECTIONS</p>
        <h1>New Collection</h1>
        <p>
          เริ่มเป็น Draft หากข้อมูลและภาพประกอบยังไม่พร้อมเผยแพร่
        </p>
        <CollectionForm
          action={createCollectionAction}
          cancelHref="/admin/catalog/collections"
        />
      </section>
    </main>
  );
}
