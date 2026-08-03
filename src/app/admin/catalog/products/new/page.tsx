import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listProductCollectionOptions } from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { createProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New Product",
  robots: { follow: false, index: false },
};

export default async function NewProductPage() {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const collectionOptions = await listProductCollectionOptions();

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
            { href: "/admin/catalog/products", label: "Products" },
            { label: "สร้างใหม่" },
          ]}
        />
        <p className="section-kicker">ADMIN / CATALOG / PRODUCTS</p>
        <h1>New Product</h1>
        <p>
          Product ที่ Published แล้วจึงจะถูกนำไปใช้ใน Storefront
          และ SKU grants
        </p>
        <ProductForm
          action={createProductAction}
          cancelHref="/admin/catalog/products"
          collections={collectionOptions}
        />
      </section>
    </main>
  );
}
