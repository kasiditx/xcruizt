import { PackagePlus, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/account/account-controls";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { filterAdminRows } from "@/modules/administration/application/admin-list-filter";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { listAdminSkus } from "@/modules/catalog/infrastructure/admin-sku-repository";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Admin SKUs",
};

export default async function AdminSkusPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; q?: string; status?: string }>;
}) {
  const account = await requireAdminPermission(ADMIN_PERMISSIONS.writeProduct);
  const [rows, query] = await Promise.all([listAdminSkus(), searchParams]);
  const visibleRows = filterAdminRows({
    getSearchText: (sku) =>
      `${sku.name} ${sku.skuCode} ${sku.slug} ${sku.productNames.join(" ")}`,
    getStatus: (sku) => sku.status,
    query: query.q,
    rows,
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
      <section className="admin-shell">
        <div className="admin-list-heading">
          <div>
            <p className="section-kicker">ADMIN / CATALOG</p>
            <h1>SKU และ Packages</h1>
            <p>กำหนดราคา สินค้าที่ได้รับ และไฟล์ที่ส่งมอบจากรายการเดียว</p>
          </div>
          <Link className="primary-action" href="/admin/catalog/skus/new">
            <PackagePlus aria-hidden="true" size={17} />
            เพิ่ม SKU
          </Link>
        </div>

        {query.notice ? (
          <AdminNotice
            message="บันทึก SKU และ Audit Log แล้ว"
            noticeCode={query.notice}
          />
        ) : null}

        <AdminListToolbar
          action="/admin/catalog/skus"
          query={query.q}
          resultCount={visibleRows.length}
          status={query.status}
          statusOptions={[
            { label: "Draft", value: "draft" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Archived", value: "archived" },
          ]}
        />

        {visibleRows.length === 0 ? (
          <div className="admin-empty">
            <h2>{rows.length === 0 ? "ยังไม่มี SKU" : "ไม่พบ SKU"}</h2>
            <p>
              {rows.length === 0
                ? "สร้าง Product จริงก่อน แล้วจึงสร้างรายการขาย"
                : "ลองเปลี่ยนคำค้นหาหรือสถานะ แล้วแสดงผลอีกครั้ง"}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--catalog">
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">ราคา</th>
                  <th scope="col">Grants</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((sku) => (
                  <tr key={sku.id}>
                    <td data-label="SKU">
                      <Link
                        className="admin-table__primary-link"
                        href={`/admin/catalog/skus/${sku.id}/edit`}
                      >
                        <strong>{sku.name}</strong>
                        <span>{sku.skuCode}</span>
                      </Link>
                    </td>
                    <td data-label="ราคา">
                      ฿{(sku.priceSatang / 100).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td data-label="Grants">{sku.productNames.join(", ")}</td>
                    <td data-label="Status">
                      <span className={`admin-status admin-status--${sku.status}`}>
                        {sku.status}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <Link
                        aria-label={`แก้ไข ${sku.name}`}
                        className="admin-table-action"
                        href={`/admin/catalog/skus/${sku.id}/edit`}
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
