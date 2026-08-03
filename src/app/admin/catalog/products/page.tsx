import { Box, Images, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { filterAdminRows } from "@/modules/administration/application/admin-list-filter";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminProducts } from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export const metadata: Metadata = {
  title: "Admin Products",
  robots: { follow: false, index: false },
};

type ProductsPageProps = {
  searchParams: Promise<{ notice?: string; q?: string; status?: string }>;
};

const notices: Record<string, string> = {
  created: "สร้าง Product และบันทึก Audit Log แล้ว",
  updated: "อัปเดต Product และบันทึก Audit Log แล้ว",
};

export default async function AdminProductsPage({
  searchParams,
}: ProductsPageProps) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.writeProduct,
  );
  const [productRows, query] = await Promise.all([
    listAdminProducts(),
    searchParams,
  ]);
  const visibleProducts = filterAdminRows({
    getSearchText: (product) =>
      `${product.name} ${product.slug} ${product.collectionName ?? ""}`,
    getStatus: (product) => product.status,
    query: query.q,
    rows: productRows,
    status: query.status,
  });

  return (
    <main className="admin-page">
      <header className="account-header">
        <Link className="wordmark" href="/">
          XCRUIZT<span>®</span>
        </Link>
        <AccountControls resolution={{ account, status: "ready" }} />
      </header>
      <section className="admin-shell" aria-labelledby="products-title">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / CATALOG</p>
            <h1 id="products-title">Products</h1>
            <p>
              Product คือสิ่งที่ลูกค้าได้รับ Entitlement หลังชำระเงิน
            </p>
          </div>
          <div className="admin-inline-actions">
            <Link
              className="admin-secondary-action"
              href="/admin/catalog/media"
            >
              <Images aria-hidden="true" size={17} />
              จัดการ Media
            </Link>
            <Link className="primary-action" href="/admin/catalog/products/new">
              <Box aria-hidden="true" size={17} /> เพิ่ม Product
            </Link>
          </div>
        </div>

        {query.notice && notices[query.notice] ? (
          <AdminNotice
            message={notices[query.notice]}
            noticeCode={query.notice}
          />
        ) : null}

        <AdminListToolbar
          action="/admin/catalog/products"
          query={query.q}
          resultCount={visibleProducts.length}
          status={query.status}
          statusOptions={[
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
            { label: "Archived", value: "archived" },
          ]}
        />

        {visibleProducts.length === 0 ? (
          <div className="admin-empty">
            <h2>{productRows.length === 0 ? "ยังไม่มี Product" : "ไม่พบ Product"}</h2>
            <p>
              {productRows.length === 0
                ? "เพิ่ม Product จริงก่อนสร้าง SKU ระบบจะไม่สร้างสินค้าเพื่อเติมหน้าจอให้อัตโนมัติ"
                : "ลองเปลี่ยนคำค้นหาหรือสถานะ แล้วแสดงผลอีกครั้ง"}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--catalog">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Collection</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <Link
                        className="admin-table__primary-link"
                        href={`/admin/catalog/products/${product.id}/edit`}
                      >
                        <strong>{product.name}</strong>
                        <span>/{product.slug}</span>
                      </Link>
                    </td>
                    <td data-label="Collection">
                      {product.collectionName ?? "—"}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`admin-status admin-status--${product.status}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td data-label="Updated">
                      {product.updatedAt.toLocaleDateString("th-TH")}
                    </td>
                    <td data-label="Actions">
                      <Link
                        aria-label={`แก้ไข ${product.name}`}
                        className="admin-table-action"
                        href={`/admin/catalog/products/${product.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={16} />
                        <span>แก้ไข</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
