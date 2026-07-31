import { Box, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminProducts } from "@/modules/catalog/infrastructure/admin-product-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export const metadata: Metadata = {
  title: "Admin Products",
  robots: { follow: false, index: false },
};

type ProductsPageProps = {
  searchParams: Promise<{ notice?: string }>;
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
  const [productRows, { notice }] = await Promise.all([
    listAdminProducts(),
    searchParams,
  ]);

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
            <Link className="admin-inline-action" href="/admin/catalog/media">Media manager</Link>
            <Link className="primary-action" href="/admin/catalog/products/new">
              <Box aria-hidden="true" size={17} /> เพิ่ม Product
            </Link>
          </div>
        </div>

        {notice && notices[notice] ? (
          <p className="admin-notice" role="status">
            {notices[notice]}
          </p>
        ) : null}

        {productRows.length === 0 ? (
          <div className="admin-empty">
            <h2>ยังไม่มี Product</h2>
            <p>
              เพิ่ม Product จริงก่อนสร้าง SKU
              ระบบจะไม่สร้างสินค้าเพื่อเติมหน้าจอให้อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                {productRows.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <span>/{product.slug}</span>
                    </td>
                    <td>{product.collectionName ?? "—"}</td>
                    <td>
                      <span
                        className={`admin-status admin-status--${product.status}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td>
                      {product.updatedAt.toLocaleDateString("th-TH")}
                    </td>
                    <td>
                      <Link
                        aria-label={`แก้ไข ${product.name}`}
                        className="admin-icon-link"
                        href={`/admin/catalog/products/${product.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={16} />
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
